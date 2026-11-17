/**
 * @file account.routes.js
 * @description The logged-in user's own profile and password (JWT required).
 *   GET /protected/profile           — JWT payload (fast, no DB)
 *   GET /protected/account           — full account row from the DB
 *   PUT /protected/change-password   — body { newPassword }
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const env = require('../config/env');
const { HttpError } = require('../middleware/errorHandler');
const { assertPasswordLength } = require('./auth.routes');

const router = express.Router();

// GET /protected/profile
router.get('/profile', (req, res) => {
  res.json({ message: 'Profile accessed successfully', user: req.user });
});

// GET /protected/account
router.get('/account', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT User_ID AS id, Name AS name, Username AS username, Role AS role, Status AS status,
            COALESCE(Email, '') AS email, COALESCE(Phone, '') AS phone,
            DATE_FORMAT(Employment_Date, '%M %e, %Y') AS formattedDate,
            DATE_FORMAT(Employment_Date, '%m/%d/%Y') AS slashDate
       FROM Users
      WHERE User_ID = ? LIMIT 1`,
    [req.user.id]
  );
  if (rows.length === 0) throw new HttpError(404, 'User not found.');
  if (rows[0].status !== 'active') throw new HttpError(403, 'Your account is currently suspended.');
  return res.json({ account: rows[0] });
});

// PUT /protected/change-password
router.put('/change-password', async (req, res) => {
  const newPassword = String(req.body?.newPassword || '');

  assertPasswordLength(newPassword);
  if (env.DEFAULT_STAFF_PASSWORDS.includes(newPassword)) {
    throw new HttpError(400, 'Please choose a password different from the default password.');
  }

  const hashed = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  const [result] = await pool.query('UPDATE Users SET Password_Hash = ? WHERE User_ID = ?', [
    hashed,
    req.user.id,
  ]);
  if (result.affectedRows === 0) throw new HttpError(404, 'User not found.');

  return res.json({ message: 'Password updated successfully!' });
});

module.exports = router;

// TEST: change-password rejects default passwords and short passwords with 400
