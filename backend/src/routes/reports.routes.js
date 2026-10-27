/**
 * @file reports.routes.js
 * @description Dashboard, sales report and transaction history (JWT required).
 *   GET /protected/dashboard-report
 *   GET /protected/sales-report?period=Daily|Weekly|Monthly|Yearly
 *   GET /protected/transactions?dateFilter=&paymentMethod=&startDate=&endDate=
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { slashDateToSql } = require('../utils/helpers');
const { HttpError } = require('../middleware/errorHandler');

const router = express.Router();

/** SQL date conditions for each reporting period (whitelisted, never user text). */
const PERIOD_FILTERS = {
  Daily: 'DATE(o.Order_Date_Time) = CURDATE()',
  Weekly: 'YEARWEEK(o.Order_Date_Time, 1) = YEARWEEK(CURDATE(), 1)',
  Monthly: 'YEAR(o.Order_Date_Time) = YEAR(CURDATE()) AND MONTH(o.Order_Date_Time) = MONTH(CURDATE())',
  Yearly: 'YEAR(o.Order_Date_Time) = YEAR(CURDATE())',
};

/**
 * Top N best-selling items within a period.
 * @param {keyof typeof PERIOD_FILTERS} period
 * @param {number} [limit]
 */
async function topSellers(period, limit = 4) {
  const [rows] = await pool.query(
    `SELECT m.Item_Name AS label, CAST(SUM(od.Quantity) AS UNSIGNED) AS value
       FROM Order_Details od
       JOIN Menu_Items m ON od.Item_ID = m.Item_ID
       JOIN Orders o     ON od.Order_ID = o.Order_ID
      WHERE ${PERIOD_FILTERS[period]}
      GROUP BY m.Item_ID, m.Item_Name
      ORDER BY value DESC
      LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

/** Common SELECT for transaction rows. Payment method is always Cash (no column yet). */
const TRANSACTION_SELECT = `
  SELECT CAST(o.Order_ID AS CHAR) AS id,
         DATE_FORMAT(o.Order_Date_Time, '%m/%d/%Y') AS date,
         DATE_FORMAT(o.Order_Date_Time, '%H:%i')    AS time,
         'Cash' AS method,
         COALESCE((SELECT GROUP_CONCAT(m.Item_Name ORDER BY m.Item_Name SEPARATOR ', ')
                     FROM Order_Details od
                     JOIN Menu_Items m ON od.Item_ID = m.Item_ID
                    WHERE od.Order_ID = o.Order_ID), 'Order') AS product,
         o.Total_Amount AS amount
    FROM Orders o`;

// GET /protected/dashboard-report — manager home: today's top sellers, total, last 3 orders
router.get('/dashboard-report', authorizeRoles('manager'), async (req, res) => {
  const salesData = await topSellers('Daily');

  const [[totals]] = await pool.query(
    `SELECT CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS total_items
       FROM Order_Details od
       JOIN Orders o ON od.Order_ID = o.Order_ID
      WHERE DATE(o.Order_Date_Time) = CURDATE()`
  );

  const [transactions] = await pool.query(
    `${TRANSACTION_SELECT} ORDER BY o.Order_Date_Time DESC LIMIT 3`
  );

  return res.json({
    salesData,
    totalSold: Number(totals?.total_items || 0),
    transactions,
  });
});

// GET /protected/sales-report?period=Daily
router.get('/sales-report', authorizeRoles('manager'), async (req, res) => {
  const period = String(req.query.period || 'Daily');
  if (!PERIOD_FILTERS[period]) {
    throw new HttpError(400, 'period must be Daily, Weekly, Monthly or Yearly.');
  }
  return res.json({ salesData: await topSellers(period) });
});

// GET /protected/transactions — full history with optional filters
router.get('/transactions', async (req, res) => {
  const { dateFilter, paymentMethod, startDate, endDate } = req.query;
  const conditions = [];
  const params = [];

  if (dateFilter === 'Today') conditions.push(PERIOD_FILTERS.Daily);
  else if (dateFilter === 'This Week') conditions.push(PERIOD_FILTERS.Weekly);
  else if (dateFilter === 'This Month') conditions.push(PERIOD_FILTERS.Monthly);
  else if (dateFilter === 'Custom') {
    const from = slashDateToSql(startDate);
    const to = slashDateToSql(endDate);
    if (!from || !to) throw new HttpError(400, 'Start and end dates are required (MM/DD/YYYY).');
    conditions.push('DATE(o.Order_Date_Time) BETWEEN ? AND ?');
    params.push(from, to);
  }

  // Only cash payments are recorded today, so an E-wallet filter returns nothing.
  if (paymentMethod && paymentMethod !== 'All' && String(paymentMethod).toLowerCase() !== 'cash') {
    return res.json({ transactions: [] });
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${TRANSACTION_SELECT} ${where} ORDER BY o.Order_Date_Time DESC LIMIT 500`,
    params
  );
  return res.json({ transactions: rows });
});

module.exports = router;

// TEST: sales-report rejects unknown period with 400
// TEST: transactions Custom filter converts MM/DD/YYYY and filters inclusively
