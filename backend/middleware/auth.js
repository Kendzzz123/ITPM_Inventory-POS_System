/**
 * @file auth.js
 * @description Authentication and authorization middleware for Express routes.
 * Verifies JWT tokens and restricts routes by user role.
 */

'use strict';

require('dotenv').config();
const jwt = require('jsonwebtoken');

/** JWT secret with fallback (should ALWAYS be set via .env in production) */
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

/**
 * Middleware: Verifies the Bearer token from the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 *
 * Expected header format: `Authorization: Bearer <TOKEN>`
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 *
 * @example
 * app.get('/protected/profile', authenticateToken, handler);
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (err) {
    console.error('[Auth] JWT verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: Restricts route access to specific roles.
 * Must be used AFTER authenticateToken.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {import('express').RequestHandler}
 *
 * @example
 * app.get('/admin', authenticateToken, authorizeRoles('Manager'), handler);
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };

// TEST: authenticateToken rejects requests without Authorization header (401)
// TEST: authenticateToken rejects invalid/expired tokens (403)
// TEST: authenticateToken attaches decoded user to req.user on valid token
// TEST: authorizeRoles allows matching roles
// TEST: authorizeRoles rejects non-matching roles (403)
