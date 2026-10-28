/**
 * @file seed.js
 * @description Loads the starting data the app needs: one manager login,
 * the Mr. Liempo menu, and the stock items. Safe to run more than once —
 * existing rows are left untouched (INSERT IGNORE).
 *
 * Usage (from backend/):  npm run db:seed
 *
 * Optional .env overrides:
 *   SEED_MANAGER_NAME, SEED_MANAGER_EMAIL, SEED_MANAGER_USERNAME
 * The manager starts with the first DEFAULT_STAFF_PASSWORDS value and is
 * asked to change it on first login.
 */

'use strict';

const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const pool = require('../src/config/db');
const ensureSchema = require('../src/config/ensureSchema');

async function seed() {
  const managerPassword = env.DEFAULT_STAFF_PASSWORDS[0];
  const manager = {
    name: process.env.SEED_MANAGER_NAME || 'Store Manager',
    username: process.env.SEED_MANAGER_USERNAME || 'manager',
    email: process.env.SEED_MANAGER_EMAIL || env.EMAIL_USER || null,
  };

  try {
    const hash = await bcrypt.hash(managerPassword, 10);
    const [userResult] = await pool.query(
      `INSERT IGNORE INTO Users (Name, Username, Password_Hash, Role, Status, Email, Employment_Date)
       VALUES (?, ?, ?, 'manager', 'active', ?, CURDATE())`,
      [manager.name, manager.username, hash, manager.email]
    );

    // Menu, stock items and portions (src/config/catalog.js) — same step the server runs on start.
    await ensureSchema();

    console.log(`Manager account: ${userResult.affectedRows ? 'created' : 'already exists'}`);
    if (userResult.affectedRows) {
      console.log(`  login: ${manager.email || manager.username}  /  password: ${managerPassword} (change on first login)`);
    }
    console.log('Menu, stock items and portions are up to date.');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
