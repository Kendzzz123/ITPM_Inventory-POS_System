/**
 * @file reports.routes.js
 * @description Dashboard, sales report and transaction history (JWT required).
 *   GET /protected/dashboard-report
 *   GET /protected/sales-report?period=Daily|Weekly|Monthly|Yearly  (chart + per-item details)
 *   GET /protected/transactions?dateFilter=&paymentMethod=&startDate=&endDate=
 *   GET /protected/transactions/export?(same filters)   (manager only — Export to Excel)
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { slashDateToSql } = require('../utils/helpers');
const { HttpError } = require('../middleware/errorHandler');
const { menuOrder } = require('../config/catalog');

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
      ORDER BY value DESC, m.Item_ID
      LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

/**
 * Every menu item with how many were sold in the period and its share of all
 * items sold, most sold first. Items on the menu with no sales are included
 * (sold 0); retired items appear only if they sold in the period.
 * @param {keyof typeof PERIOD_FILTERS} period
 * @returns {Promise<{ details: {name: string, sold: number, percent: number}[], totalSold: number }>}
 */
async function salesDetails(period) {
  const [rows] = await pool.query(
    `SELECT m.Item_Name AS name, m.Is_Active AS active,
            CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS sold
       FROM Menu_Items m
       LEFT JOIN (Order_Details od JOIN Orders o ON o.Order_ID = od.Order_ID AND ${PERIOD_FILTERS[period]})
              ON od.Item_ID = m.Item_ID
      GROUP BY m.Item_ID, m.Item_Name, m.Is_Active
     HAVING active = 1 OR sold > 0`
  );
  const totalSold = rows.reduce((sum, r) => sum + Number(r.sold), 0);
  const details = rows
    .map((r) => ({
      name: r.name,
      sold: Number(r.sold),
      percent: totalSold ? Math.round((Number(r.sold) / totalSold) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.sold - a.sold || menuOrder(a.name) - menuOrder(b.name));
  return { details, totalSold };
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
    `${TRANSACTION_SELECT} ORDER BY o.Order_Date_Time DESC, o.Order_ID DESC LIMIT 3`
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
  const [salesData, { details, totalSold }] = await Promise.all([topSellers(period), salesDetails(period)]);
  return res.json({ salesData, details, totalSold });
});

/**
 * Transaction rows matching the optional filters in the query string.
 * Shared by the on-screen history and the manager-only Excel export.
 * @param {Record<string, unknown>} query req.query
 */
async function findTransactions(query) {
  const { dateFilter, paymentMethod, startDate, endDate } = query;
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
    return [];
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${TRANSACTION_SELECT} ${where} ORDER BY o.Order_Date_Time DESC, o.Order_ID DESC LIMIT 500`,
    params
  );
  return rows;
}

// GET /protected/transactions — full history with optional filters (manager + cashier)
router.get('/transactions', async (req, res) => {
  return res.json({ transactions: await findTransactions(req.query) });
});

// GET /protected/transactions/export — same filters, for Export to Excel (manager only)
router.get('/transactions/export', authorizeRoles('manager'), async (req, res) => {
  return res.json({ transactions: await findTransactions(req.query) });
});

module.exports = router;

// TEST: sales-report rejects unknown period with 400
// TEST: sales-report details list every active menu item; percents add up to 100 when anything sold
// TEST: transactions Custom filter converts MM/DD/YYYY and filters inclusively
// TEST: transactions/export -> 403 for a cashier token, 200 with rows for a manager token
