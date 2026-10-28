/**
 * @file inventory.routes.js
 * @description Stock levels, restocking and waste (JWT required).
 *   GET  /protected/stocks
 *   POST /protected/restock         (manager)
 *   POST /protected/waste           (manager)
 *   GET  /protected/waste-history
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { positiveNumber, newRequestId } = require('../utils/helpers');

const router = express.Router();

/**
 * Resolves a stock item from either stockId or itemName. Never creates items.
 * @returns {Promise<number>} Stock_ID
 */
async function resolveStockId(conn, { stockId, itemName }) {
  if (stockId) {
    const [rows] = await conn.query('SELECT Stock_ID FROM Stock_Items WHERE Stock_ID = ?', [stockId]);
    if (rows.length) return rows[0].Stock_ID;
  } else if (itemName) {
    const [rows] = await conn.query('SELECT Stock_ID FROM Stock_Items WHERE Stock_Name = ? LIMIT 1', [
      String(itemName).trim(),
    ]);
    if (rows.length) return rows[0].Stock_ID;
  }
  throw new HttpError(404, 'Stock item not found.');
}

// GET /protected/stocks
router.get('/stocks', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT Stock_ID AS id, Stock_Name AS name, Unit AS unit,
            Current_Quantity AS quantity, Minimum_Level AS minLevel
       FROM Stock_Items
      ORDER BY Stock_ID ASC`
  );
  const stocks = rows.map((r) => ({
    ...r,
    quantity: Number(r.quantity),
    minLevel: Number(r.minLevel),
    isLow: Number(r.quantity) <= Number(r.minLevel),
  }));
  return res.json({ stocks, hasLowStock: stocks.some((s) => s.isLow) });
});

// POST /protected/restock — creates a purchase order and receives it (sp_receive_po)
router.post('/restock', authorizeRoles('manager'), async (req, res) => {
  const { stockId, itemName, quantity } = req.body ?? {};
  const qty = positiveNumber(quantity, 'Quantity');

  const conn = await pool.getConnection();
  try {
    const targetId = await resolveStockId(conn, { stockId, itemName });

    await conn.beginTransaction();
    const [po] = await conn.query('INSERT INTO Purchase_Orders (Order_Date) VALUES (NOW())');
    await conn.query('INSERT INTO Purchase_Order_Items (PO_ID, Stock_ID, Quantity) VALUES (?, ?, ?)', [
      po.insertId,
      targetId,
      qty,
    ]);
    await conn.commit();

    // Procedure runs its own transaction: updates balance + ledger atomically.
    await conn.query('CALL sp_receive_po(?, ?)', [po.insertId, req.user.id]);

    return res.json({ message: 'Item restocked successfully!' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
});

// POST /protected/waste — records waste via sp_record_waste
router.post('/waste', authorizeRoles('manager'), async (req, res) => {
  const { stockId, itemName, quantity, reason, clientRequestId } = req.body ?? {};
  const qty = positiveNumber(quantity, 'Quantity');
  const cleanReason = String(reason || 'Recorded waste').trim().slice(0, 255) || 'Recorded waste';

  const targetId = await resolveStockId(pool, { stockId, itemName });
  await pool.query('CALL sp_record_waste(?, ?, ?, ?, ?, @waste_id)', [
    req.user.id,
    newRequestId(clientRequestId),
    targetId,
    qty,
    cleanReason,
  ]);

  return res.json({ message: 'Waste recorded successfully!' });
});

// GET /protected/waste-history
router.get('/waste-history', authorizeRoles('manager'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT CAST(w.Waste_ID AS CHAR) AS id,
            DATE_FORMAT(w.Date, '%m/%d/%Y') AS date,
            s.Stock_Name AS item,
            CAST(TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM w.Quantity)) AS CHAR) AS quantity,
            w.Reason AS reason
       FROM Waste_Log w
       JOIN Stock_Items s ON w.Stock_ID = s.Stock_ID
      ORDER BY w.Date DESC, w.Waste_ID DESC`
  );
  return res.json({ history: rows });
});

module.exports = router;

// TEST: restock with unknown itemName -> 404 and no Purchase_Orders row is created
// TEST: waste larger than the balance -> 400 "Unknown stock item or waste exceeds balance"
