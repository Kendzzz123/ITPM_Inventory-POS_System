/**
 * @file app.js
 * @description Builds the Express app (no listen) so it can be imported by tests.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');
const reportsRoutes = require('./routes/reports.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const menuRoutes = require('./routes/menu.routes');
const staffRoutes = require('./routes/staff.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Health check — open http://<host>:3000/health to confirm the API and DB are up.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
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
