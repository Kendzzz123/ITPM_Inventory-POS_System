/**
 * @file menu.routes.js
 * @description Menu items, prices and portions (JWT required).
 *   GET /protected/menu-items                 — items + portion + how many orders stock allows
 *   PUT /protected/menu-items/:id             (manager) — body { price }
 *   PUT /protected/menu-items/:id/portion     (manager) — body { stockId, quantityUsed }
 *
 * A "portion" (Recipe_Portions row) is how much stock ONE order uses.
 * sp_create_order deducts it on every sale and refuses the sale if stock is short.
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { positiveNumber, idParam } = require('../utils/helpers');

const router = express.Router();

// GET /protected/menu-items — active items with portions and availability
router.get('/menu-items', async (req, res) => {
  const [items] = await pool.query(
    `SELECT Item_ID AS id, Item_Name AS name, Price AS price, Category AS category
       FROM Menu_Items
      WHERE Is_Active = 1
      ORDER BY Item_ID ASC`
  );
  const [portions] = await pool.query(
    `SELECT r.Item_ID AS itemId, s.Stock_ID AS stockId, s.Stock_Name AS stockName, s.Unit AS unit,
            r.Quantity_Used AS quantityUsed, s.Current_Quantity AS inStock
       FROM Recipe_Portions r
       JOIN Stock_Items s ON s.Stock_ID = r.Stock_ID`
  );

  const result = items.map((item) => {
    const mine = portions
      .filter((p) => p.itemId === item.id)
      .map((p) => ({
        stockId: p.stockId,
        stockName: p.stockName,
        unit: p.unit,
        quantityUsed: Number(p.quantityUsed),
        inStock: Number(p.inStock),
      }));
    // Orders the current stock can cover (null = no portion set, so not limited).
    const available = mine.length
      ? Math.min(...mine.map((p) => Math.floor((p.inStock + 1e-9) / p.quantityUsed)))
      : null;
    return { ...item, price: Number(item.price), portions: mine, available };
  });

  return res.json({ items: result });
});

// PUT /protected/menu-items/:id — update price by id only
router.put('/menu-items/:id', authorizeRoles('manager'), async (req, res) => {
  const id = idParam(req.params.id);
  const price = positiveNumber(req.body?.price, 'Price');
  if (price > 99999999) throw new HttpError(400, 'Price is too large.');

  const [result] = await pool.query('UPDATE Menu_Items SET Price = ? WHERE Item_ID = ?', [
    Math.round(price * 100) / 100,
    id,
  ]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Menu item not found.');

  return res.json({ message: 'Price updated successfully' });
});

// PUT /protected/menu-items/:id/portion — set which stock one order uses, and how much
router.put('/menu-items/:id/portion', authorizeRoles('manager'), async (req, res) => {
  const id = idParam(req.params.id);
  const stockId = idParam(req.body?.stockId);
  const quantityUsed = positiveNumber(req.body?.quantityUsed, 'Portion');
  if (quantityUsed > 100000) throw new HttpError(400, 'Portion is too large.');

  const [[item]] = await pool.query('SELECT Item_ID FROM Menu_Items WHERE Item_ID = ?', [id]);
  if (!item) throw new HttpError(404, 'Menu item not found.');
  const [[stock]] = await pool.query('SELECT Stock_ID FROM Stock_Items WHERE Stock_ID = ?', [stockId]);
  if (!stock) throw new HttpError(404, 'Stock item not found.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // One stock item per menu item: replace whatever was there.
    await conn.query('DELETE FROM Recipe_Portions WHERE Item_ID = ?', [id]);
    await conn.query('INSERT INTO Recipe_Portions (Item_ID, Stock_ID, Quantity_Used) VALUES (?, ?, ?)', [
      id,
      stockId,
      Math.round(quantityUsed * 1000) / 1000,
    ]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return res.json({ message: 'Portion updated successfully' });
});

module.exports = router;

// TEST: GET returns available = floor(stock / quantityUsed); null when no portion is set
// TEST: PUT portion with quantityUsed 0 -> 400; unknown stockId -> 404; valid -> replaces old row
// TEST: a sale of 2 Half Juicy Chicken deducts 1 Raw Chicken (2 x 0.5)
