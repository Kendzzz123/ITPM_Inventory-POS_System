/**
 * @file staff.routes.js
 * @description Staff (cashier) management (JWT required).
 *   GET    /protected/staff                 (manager)
 *   POST   /protected/staff                 (manager)
 *   PUT    /protected/staff/:id             (manager, or the user editing themself)
 *   PATCH  /protected/staff/:id/suspend     (manager) — body { status: 'suspended'|'active', days? }
 *   DELETE /protected/staff/:id             (manager)
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { slashDateToSql, idParam, isValidEmail } = require('../utils/helpers');
const { MIN_PASSWORD_LENGTH } = require('./auth.routes');

const router = express.Router();
const managerOnly = authorizeRoles('manager');

/** Trims a string field; returns null for empty values. */
function clean(value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s.slice(0, max);
}

/** Validates optional email/phone fields shared by create and edit. */
function validateContact({ email, phone }) {
  if (email && !isValidEmail(email)) throw new HttpError(400, 'Please enter a valid email address.');
  if (phone && !/^[0-9+\-\s]{7,20}$/.test(phone)) {
    throw new HttpError(400, 'Phone number may only contain digits, spaces, + and -.');
  }
}

/** Builds a unique username from a full name, e.g. "Juan Dela Cruz" -> "juandelacruz", "juandelacruz2". */
async function uniqueUsername(name) {
  const base = (name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff').slice(0, 40).padEnd(3, '0');
  const [rows] = await pool.query('SELECT Username FROM Users WHERE Username LIKE ?', [`${base}%`]);
  const taken = new Set(rows.map((r) => r.Username));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i += 1) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Ensures the target exists and is a cashier (managers can't be suspended/deleted here). */
async function assertCashier(id) {
  const [rows] = await pool.query('SELECT Role FROM Users WHERE User_ID = ?', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Staff member not found.');
  if (rows[0].Role !== 'cashier') throw new HttpError(403, 'Only cashier accounts can be changed here.');
}

// GET /protected/staff — all cashiers
router.get('/staff', managerOnly, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT User_ID AS id, Name AS name, Username AS username, Role AS role, Status AS status,
            COALESCE(Email, '') AS email, COALESCE(Phone, '') AS phone,
            DATE_FORMAT(Employment_Date, '%m/%d/%Y') AS employmentDate,
            DATE_FORMAT(Suspended_Until, '%m/%d/%Y') AS suspendedUntil
       FROM Users
      WHERE Role = 'cashier'
      ORDER BY Name ASC`
  );
  return res.json({ staff: rows });
});

// POST /protected/staff — create a cashier
router.post('/staff', managerOnly, async (req, res) => {
  const name = clean(req.body?.name, 100);
  const email = clean(req.body?.email, 150);
  const phone = clean(req.body?.phone, 20);
  const password = String(req.body?.password || '');

  if (!name) throw new HttpError(400, 'Name is required.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  validateContact({ email, phone });

  const employmentDate = slashDateToSql(req.body?.employmentDate) || new Date().toISOString().slice(0, 10);
  const username = await uniqueUsername(name);
  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO Users (Name, Username, Password_Hash, Role, Status, Email, Phone, Employment_Date)
     VALUES (?, ?, ?, 'cashier', 'active', ?, ?, ?)`,
    [name, username, passwordHash, email, phone, employmentDate]
  );

  return res.status(201).json({ message: 'Staff created successfully', id: result.insertId, username });
});

// PUT /protected/staff/:id — edit staff details (or own profile)
router.put('/staff/:id', async (req, res) => {
  const id = idParam(req.params.id);
  const isSelf = Number(req.user.id) === id;
  const isManager = String(req.user.role).toLowerCase() === 'manager';
  if (!isSelf && !isManager) throw new HttpError(403, 'You do not have permission to do this.');

  const name = clean(req.body?.name, 100);
  const email = clean(req.body?.email, 150);
  const phone = clean(req.body?.phone, 20);
  validateContact({ email, phone });
  const employmentDate = slashDateToSql(req.body?.employmentDate);

  const [result] = await pool.query(
    `UPDATE Users
        SET Name = COALESCE(?, Name),
            Phone = ?,
            Email = ?,
            Employment_Date = COALESCE(?, Employment_Date)
      WHERE User_ID = ?`,
    [name, phone, email, employmentDate, id]
  );
  if (result.affectedRows === 0) throw new HttpError(404, 'Staff member not found.');

  return res.json({ message: 'Updated successfully' });
});

// PATCH /protected/staff/:id/suspend — suspend (optionally for N days) or reactivate
router.patch('/staff/:id/suspend', managerOnly, async (req, res) => {
  const id = idParam(req.params.id);
  const status = req.body?.status ?? 'suspended';
  if (!['active', 'suspended'].includes(status)) throw new HttpError(400, 'Invalid status value.');
  await assertCashier(id);

  let days = null;
  if (status === 'suspended' && req.body?.days !== undefined && req.body?.days !== '') {
    days = Number(req.body.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new HttpError(400, 'Suspension days must be a whole number from 1 to 3650.');
    }
  }

  await pool.query(
    `UPDATE Users
        SET Status = ?,
            Suspended_Until = ${days ? 'DATE_ADD(NOW(), INTERVAL ? DAY)' : 'NULL'}
      WHERE User_ID = ?`,
    days ? [status, days, id] : [status, id]
  );

  return res.json({ message: `Staff status updated to ${status}`, status });
});

// DELETE /protected/staff/:id — only works for staff without sales/waste history
router.delete('/staff/:id', managerOnly, async (req, res) => {
  const id = idParam(req.params.id);
  await assertCashier(id);

  try {
    await pool.query('DELETE FROM OTP_Codes WHERE User_ID = ?', [id]);
    await pool.query('DELETE FROM Users WHERE User_ID = ?', [id]);
  } catch (err) {
    if (String(err.code).startsWith('ER_ROW_IS_REFERENCED')) {
      throw new HttpError(
        400,
        'Cannot permanently delete staff with existing transaction records. Suspend them instead.'
      );
    }
    throw err;
  }
  return res.json({ message: 'Staff account deleted successfully' });
});

module.exports = router;

// TEST: POST /staff generates "name", then "name2" for a duplicate name
// TEST: PATCH suspend with days=6 sets Suspended_Until ~6 days ahead; status=active clears it
// TEST: DELETE staff with orders -> 400 with "Suspend them instead"
// TEST: cashier calling PUT /staff/:otherId -> 403
