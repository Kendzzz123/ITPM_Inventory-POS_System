/**
 * @file app.js
 * @description Builds the Express app (no listen) so it can be imported by tests.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const env = require('./config/env');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimit = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const reportsRoutes = require('./routes/reports.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const menuRoutes = require('./routes/menu.routes');
const staffRoutes = require('./routes/staff.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();

// Hide the Express fingerprint and set hardening headers.
app.disable('x-powered-by');
app.use(securityHeaders);

// CORS (tightened). A native app / curl sends no Origin and is always allowed.
// Browser requests are allowed only from configured origins; with none set,
// only local-dev / LAN origins are permitted (so a random website can't call
// the API from a victim's browser). No cookies are used, so credentials are off.
const LAN_OR_LOCAL =
  /^https?:\/\/(localhost|127\.0\.0\.1|(10|127)\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // native app, mobile, server-to-server
      if (env.CORS_ORIGINS.length) return cb(null, env.CORS_ORIGINS.includes(origin));
      return cb(null, LAN_OR_LOCAL.test(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

app.use(express.json({ limit: '100kb' }));

// Gentle flood guard across the whole API (well above normal POS traffic).
app.use(rateLimit({ windowMs: 60 * 1000, max: 300, message: 'Too many requests. Slow down.' }));

// Health check — open http://<host>:3000/health to confirm the API and DB are up.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    // Log the real error for the owner; don't expose DB internals to clients.
    console.error('[health] DB check failed:', err.message);
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Public
app.use('/auth', authRoutes);

// Everything under /protected needs a valid JWT
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);
protectedRouter.get('/manager-dashboard', authorizeRoles('manager'), (req, res) => {
  res.json({ message: 'Welcome to the Manager Dashboard', user: req.user });
});
protectedRouter.use(accountRoutes);
protectedRouter.use(reportsRoutes);
protectedRouter.use(inventoryRoutes);
protectedRouter.use(menuRoutes);
protectedRouter.use(staffRoutes);
protectedRouter.use(ordersRoutes);
app.use('/protected', protectedRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
