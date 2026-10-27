/**
 * @file orders.routes.js
 * @description POS checkout (JWT required).
 *   POST /protected/orders — body { items: [{ item_id, qty }], amountReceived, clientRequestId? }
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');
const { positiveNumber, newRequestId } = require('../utils/helpers');

const router = express.Router();

/**
 * Validates and merges cart lines: [{item_id, qty}] with positive integers.
 * @param {unknown} items
 */
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Cart cannot be empty.');
  const merged = new Map();
  for (const line of items) {
    const id = Number(line?.item_id);
    const qty = Number(line?.qty);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(qty) || qty <= 0 || qty > 1000) {
      throw new HttpError(400, 'Each cart item needs a valid item and a quantity from 1 to 1000.');
    }
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  return [...merged].map(([item_id, qty]) => ({ item_id, qty }));
}

// POST /protected/orders — sp_create_order validates prices, payment and stock atomically
router.post('/orders', async (req, res) => {
  const items = normalizeItems(req.body?.items);
  const amountReceived = positiveNumber(req.body?.amountReceived, 'Amount received');
  const requestId = newRequestId(req.body?.clientRequestId);

  // Same connection so the @session variables are readable afterwards.
  const conn = await pool.getConnection();
  try {
    try {
      await conn.query('CALL sp_create_order(?, ?, ?, ?, @o_order_id, @o_change)', [
        req.user.id,
        requestId,
        JSON.stringify(items),
        amountReceived,
      ]);
    } catch (err) {
      // Duplicate clientRequestId = the same cart was already submitted (double tap / retry).
      if (err.code === 'ER_DUP_ENTRY' && /idem/i.test(err.sqlMessage)) {
        const [rows] = await conn.query(
          `SELECT o.Order_ID AS orderId, p.Change_Amount AS changeAmount
             FROM Orders o JOIN Payments p ON p.Order_ID = o.Order_ID
            WHERE o.User_ID = ? AND o.Client_Request_ID = ?`,
          [req.user.id, requestId]
        );
        if (rows.length) {
          return res.json({ message: 'Transaction success!', ...rows[0], changeAmount: Number(rows[0].changeAmount) });
        }
      }
      throw err;
    }

    const [[out]] = await conn.query('SELECT @o_order_id AS orderId, @o_change AS changeAmount');
    return res.status(201).json({
      message: 'Transaction success!',
      orderId: out?.orderId,
      changeAmount: Number(out?.changeAmount || 0),
    });
  } finally {
    conn.release();
  }
});

module.exports = router;

// TEST: empty cart -> 400; underpayment -> 400 "Underpayment"; insufficient stock -> 400
// TEST: posting the same clientRequestId twice returns the first order instead of a duplicate
