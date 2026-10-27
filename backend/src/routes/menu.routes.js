/**
 * @file menu.routes.js
 * @description Menu items and prices (JWT required).
 *   GET /protected/menu-items
 *   PUT /protected/menu-items/:id   (manager) — body { price }
 */

'use strict';

const express = require('express');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { positiveNumber, idParam } = require('../utils/helpers');

const router = express.Router();

// GET /protected/menu-items — active items only
router.get('/menu-items', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT Item_ID AS id, Item_Name AS name, Price AS price, Category AS category
       FROM Menu_Items
      WHERE Is_Active = 1
      ORDER BY Item_ID ASC`
  );
  return res.json({ items: rows.map((r) => ({ ...r, price: Number(r.price) })) });
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

module.exports = router;

// TEST: PUT with price 0 -> 400; unknown id -> 404; valid -> 200 and GET returns new price
