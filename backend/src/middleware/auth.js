/**
 * @file auth.js
 * @description JWT authentication and role-based authorization middleware.
 */

'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Verifies `Authorization: Bearer <token>` and attaches the payload to req.user.
 * @type {import('express').RequestHandler}
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access denied: No token provided' });
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET); // { id, username, role, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
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

module.exports = { authenticateToken, authorizeRoles, signToken };

// TEST: authenticateToken -> 401 without header, 401 on bad token, next() on valid token
// TEST: authorizeRoles('manager') accepts role 'Manager' and 'manager', rejects 'cashier' with 403
