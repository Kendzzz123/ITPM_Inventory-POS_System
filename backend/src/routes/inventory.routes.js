/**
 * @file inventory.routes.js
 * @description Stock levels, restocking and waste (JWT required).
 *   GET  /protected/stocks
 *   POST /protected/restock         (manager) one item, or items: [{ stockId, quantity }]
 *   POST /protected/waste           (manager)
 *   GET  /protected/waste-history?dateFilter=Today|This Week|This Month|Custom&startDate=&endDate=
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { positiveNumber, newRequestId, slashDateToSql, localDateSql } = require('../utils/helpers');
const { menuOrder, WHOLE_UNITS } = require('../config/catalog');

const router = express.Router();

/**
 * Resolves an active (visible) stock item from either stockId or itemName.
 * Hidden stock (Raw Chicken, Raw Pork, ...) can't be restocked or wasted.
 * Never creates items.
 * @returns {Promise<{ id: number, name: string, unit: string }>}
 */
async function resolveStock(conn, { stockId, itemName }) {
  const columns = 'SELECT Stock_ID AS id, Stock_Name AS name, Unit AS unit FROM Stock_Items';
  if (stockId) {
    const [rows] = await conn.query(`${columns} WHERE Stock_ID = ? AND Is_Active = 1`, [stockId]);
    if (rows.length) return rows[0];
  } else if (itemName) {
    const [rows] = await conn.query(`${columns} WHERE Stock_Name = ? AND Is_Active = 1 LIMIT 1`, [
      String(itemName).trim(),
    ]);
    if (rows.length) return rows[0];
  }
  throw new HttpError(404, 'Stock item not found.');
}

/** Pieces and packs are counted in whole numbers: 2 is fine, 1.5 is refused. */
function assertWholeQuantity(stock, qty) {
  if (WHOLE_UNITS.includes(stock.unit) && !Number.isInteger(qty)) {
    throw new HttpError(400, `${stock.name} is counted in whole numbers. Please enter a whole quantity.`);
  }
}

// GET /protected/stocks — visible stock only, in POS menu order
router.get('/stocks', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.Stock_ID AS id, s.Stock_Name AS name, s.Unit AS unit,
            s.Current_Quantity AS quantity, s.Minimum_Level AS minLevel
       FROM Stock_Items s
       LEFT JOIN Menu_Items m ON m.Item_Name = s.Stock_Name
      WHERE s.Is_Active = 1
      ORDER BY COALESCE(m.Item_ID, 999999), s.Stock_ID`
  );
  const stocks = rows.map((r) => ({
    ...r,
    quantity: Number(r.quantity),
    minLevel: Number(r.minLevel),
    isLow: Number(r.quantity) <= Number(r.minLevel),
  }));
  stocks.sort((a, b) => menuOrder(a.name) - menuOrder(b.name)); // same order as the POS menu
  return res.json({ stocks, hasLowStock: stocks.some((s) => s.isLow) });
});

/** Most items one restock may hold (the screen lists fewer than this). */
const MAX_RESTOCK_ITEMS = 50;

// POST /protected/restock — creates ONE purchase order and receives it (sp_receive_po).
// Body: { items: [{ stockId, quantity }, ...] }  or the older single { stockId | itemName, quantity }.
// All items are added together or none are (the procedure is one transaction).
router.post('/restock', authorizeRoles('manager'), async (req, res) => {
  const body = req.body ?? {};
  const list = Array.isArray(body.items)
    ? body.items
    : [{ stockId: body.stockId, itemName: body.itemName, quantity: body.quantity }];
  if (list.length === 0) throw new HttpError(400, 'Choose at least one item to restock.');
  if (list.length > MAX_RESTOCK_ITEMS) {
    throw new HttpError(400, `A restock can have at most ${MAX_RESTOCK_ITEMS} items.`);
  }

  const conn = await pool.getConnection();
  try {
    // Check every line first; the same item twice is added up into one line.
    const lines = new Map(); // Stock_ID -> quantity
    for (const item of list) {
      const qty = positiveNumber(item?.quantity, 'Quantity');
      const stock = await resolveStock(conn, { stockId: item?.stockId, itemName: item?.itemName });
      assertWholeQuantity(stock, qty);
      lines.set(stock.id, (lines.get(stock.id) || 0) + qty);
    }

    await conn.beginTransaction();
    const [po] = await conn.query('INSERT INTO Purchase_Orders (Order_Date) VALUES (NOW())');
    for (const [targetId, qty] of lines) {
      await conn.query('INSERT INTO Purchase_Order_Items (PO_ID, Stock_ID, Quantity) VALUES (?, ?, ?)', [
        po.insertId,
        targetId,
        qty,
      ]);
    }
    await conn.commit();

    // Procedure runs its own transaction: updates every balance + the ledger atomically.
    await conn.query('CALL sp_receive_po(?, ?)', [po.insertId, req.user.id]);

    const message =
      lines.size === 1 ? 'Item restocked successfully!' : `${lines.size} items restocked successfully!`;
    return res.json({ message, poId: po.insertId, items: lines.size });
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
});

// POST /protected/waste — records waste via sp_record_waste_on
// wasteDate (MM/DD/YYYY, optional): the day picked on Record Waste; empty = now.
router.post('/waste', authorizeRoles('manager'), async (req, res) => {
  const { stockId, itemName, quantity, reason, clientRequestId, wasteDate } = req.body ?? {};
  const qty = positiveNumber(quantity, 'Quantity');
  const cleanReason = String(reason || 'Recorded waste').trim().slice(0, 255) || 'Recorded waste';
  const day = slashDateToSql(wasteDate); // null when not given; 400 when malformed
  if (day && day > localDateSql()) throw new HttpError(400, 'Waste date cannot be in the future.');

  const stock = await resolveStock(pool, { stockId, itemName });
  assertWholeQuantity(stock, qty);
  const args = [req.user.id, newRequestId(clientRequestId), stock.id, qty, cleanReason];
  try {
    await pool.query('CALL sp_record_waste_on(?, ?, ?, ?, ?, ?, @waste_id)', [...args, day]);
  } catch (err) {
    // Database not upgraded yet (migration 005): record it dated today instead.
    if (err.code !== 'ER_SP_DOES_NOT_EXIST') throw err;
    await pool.query('CALL sp_record_waste(?, ?, ?, ?, ?, @waste_id)', args);
  }

  return res.json({ message: 'Waste recorded successfully!' });
});

/** Date conditions for the Waste History filter (same choices as Transaction History). */
const WASTE_DATE_FILTERS = {
  Today: 'DATE(w.Date) = CURDATE()',
  'This Week': 'YEARWEEK(w.Date, 1) = YEARWEEK(CURDATE(), 1)',
  'This Month': 'YEAR(w.Date) = YEAR(CURDATE()) AND MONTH(w.Date) = MONTH(CURDATE())',
};

// GET /protected/waste-history — optional date filter, newest first
router.get('/waste-history', authorizeRoles('manager'), async (req, res) => {
  const { dateFilter, startDate, endDate } = req.query;
  // old Raw Chicken / Raw Pork / ... waste stays in the DB, just not listed
  const conditions = ['s.Is_Active = 1'];
  const params = [];

  // Own keys only: a plain lookup would also match "constructor" or "toString".
  if (typeof dateFilter === 'string' && Object.hasOwn(WASTE_DATE_FILTERS, dateFilter)) {
    conditions.push(WASTE_DATE_FILTERS[dateFilter]);
  } else if (dateFilter === 'Custom') {
    const from = slashDateToSql(startDate);
    const to = slashDateToSql(endDate);
    if (!from || !to) throw new HttpError(400, 'Start and end dates are required (MM/DD/YYYY).');
    if (from > to) throw new HttpError(400, 'The start date must be on or before the end date.');
    conditions.push('DATE(w.Date) BETWEEN ? AND ?');
    params.push(from, to);
  } else if (dateFilter !== undefined && dateFilter !== '') {
    throw new HttpError(400, 'dateFilter must be Today, This Week, This Month or Custom.');
  }

  const [rows] = await pool.query(
    `SELECT CAST(w.Waste_ID AS CHAR) AS id,
            DATE_FORMAT(w.Date, '%m/%d/%Y') AS date,
            s.Stock_Name AS item,
            CAST(TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM w.Quantity)) AS CHAR) AS quantity,
            w.Reason AS reason
       FROM Waste_Log w
       JOIN Stock_Items s ON w.Stock_ID = s.Stock_ID
      WHERE ${conditions.join(' AND ')}
      ORDER BY w.Date DESC, w.Waste_ID DESC`,
    params
  );
  return res.json({ history: rows });
});

module.exports = router;

// TEST: restock with unknown itemName -> 404 and no Purchase_Orders row is created
// TEST: restock items [A x5, B x3] -> one PO with 2 lines, both balances up; one bad item -> 404 and nothing added
// TEST: stocks / restock / waste / waste-history ignore hidden stock (Is_Active = 0)
// TEST: waste-history?dateFilter=Today -> only today's waste; Custom 11/01/2026-11/14/2026 -> inclusive range; Custom with a missing date -> 400
// TEST: waste-history?dateFilter=constructor (or any unknown value) -> 400, not 500
// TEST: waste with wasteDate 11/13/2026 -> Waste History shows 11/13/2026; a future wasteDate -> 400
// TEST: waste larger than the balance -> 400 "Unknown stock item or waste exceeds balance"
// TEST: restock or waste of 1.5 Sarsa (Gravy) (packs) -> 400 "... counted in whole numbers"; 2 -> OK
