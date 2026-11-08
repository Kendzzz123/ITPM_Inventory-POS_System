/**
 * @file auth.js
 * @description JWT authentication and role-based authorization middleware.
 */

'use strict';

const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const env = require('../config/env');

/**
 * Lifts a timed suspension whose end date has passed.
 * @param {{ User_ID: number, Status: string, Suspended_Until: Date|null }} user
 * @returns {Promise<boolean>} true if the account is (now) active
 */
async function refreshSuspension(user) {
  if (user.Status !== 'suspended') return true;
  if (user.Suspended_Until && new Date(user.Suspended_Until) <= new Date()) {
    await pool.query(
      "UPDATE Users SET Status = 'active', Suspended_Until = NULL WHERE User_ID = ?",
      [user.User_ID]
    );
    user.Status = 'active';
    return true;
  }
  return false;
}

/** "Your account is currently suspended." (+ " until 11/10/2026" for a timed one) */
function suspendedMessage(user) {
  const until = user.Suspended_Until
    ? ` until ${new Date(user.Suspended_Until).toLocaleDateString('en-US')}`
    : '';
  return `Your account is currently suspended${until}.`;
}

/**
 * Verifies `Authorization: Bearer <token>`, then checks the account is still
 * there and active, and attaches the user to req.user.
 *
 * The status check matters because a token stays valid for JWT_EXPIRES_IN
 * (1 day): without it, a cashier suspended or deleted after logging in could
 * keep reading stock and transactions until the token ran out.
 * @type {import('express').RequestHandler}
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access denied: No token provided' });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET); // { id, username, role, iat, exp }
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'Session expired. Please log in again.'
        : 'Invalid session. Please log in again.';
    return res.status(401).json({ message });
  }

  const [rows] = await pool.query(
    'SELECT User_ID, Username, Role, Status, Suspended_Until FROM Users WHERE User_ID = ? LIMIT 1',
    [payload.id]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'This account no longer exists. Please log in again.' });
  }
  if (!(await refreshSuspension(user))) {
    return res.status(403).json({ message: suspendedMessage(user) });
  }

  // Role and username come from the DB, so a change takes effect right away.
  req.user = { ...payload, id: user.User_ID, username: user.Username, role: user.Role };
  return next();
}

/**
 * Restricts a route to the given roles (case-insensitive: DB stores 'manager').
 * Must run after authenticateToken.
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
function authorizeRoles(...allowedRoles) {
  const allowed = allowedRoles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (!allowed.includes(role)) {
      return res.status(403).json({ message: 'You do not have permission to do this.' });
    }
    return next();
  };
}

/**
 * Signs a JWT for a user row.
 * @param {{ User_ID: number, Username: string, Role: string }} user
 */
function signToken(user) {
  return jwt.sign(
    { id: user.User_ID, username: user.Username, role: user.Role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

module.exports = { authenticateToken, authorizeRoles, signToken, refreshSuspension, suspendedMessage };

// TEST: authenticateToken -> 401 without header; 401 "Session expired" on an expired token;
//       401 "Invalid session" on a forged/tampered token; next() on a valid token
// TEST: suspended user's old token -> 403 on every /protected route; deleted user's token -> 401
// TEST: timed suspension that has ended is lifted on the next request
// TEST: authorizeRoles('manager') accepts role 'Manager' and 'manager', rejects 'cashier' with 403
