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

/** Menu shown in POS / Manage Price. Prices can be changed later in the app. */
const MENU_ITEMS = [
  { name: 'Whole Juicy Chicken', price: 320, category: 'Chicken' },
  { name: 'Half Juicy Chicken', price: 285, category: 'Chicken' },
  { name: 'Liempo', price: 285, category: 'Pork' },
  { name: 'Regular Chorizo', price: 140, category: 'Chorizo' },
  { name: 'Spicy Chorizo', price: 145, category: 'Chorizo' },
  { name: 'Atsara', price: 25, category: 'Sides' },
  { name: 'Sarsa (Gravy)', price: 7, category: 'Sides' },
];

/** Inventory tracked in Stocks / Restock / Record Waste. Quantities start at 0 — use Restock. */
const STOCK_ITEMS = [
  { name: 'Raw Chicken', unit: 'pcs', minLevel: 10 },
  { name: 'Raw Pork', unit: 'kg', minLevel: 5 },
  { name: 'Regular Chorizo', unit: 'pcs', minLevel: 20 },
  { name: 'Spicy Chorizo', unit: 'pcs', minLevel: 20 },
  { name: 'Atsara', unit: 'packs', minLevel: 10 },
  { name: 'Sarsa (Gravy)', unit: 'L', minLevel: 2 },
];

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

    const [menuResult] = await pool.query(
      'INSERT IGNORE INTO Menu_Items (Item_Name, Price, Category) VALUES ?',
      [MENU_ITEMS.map((m) => [m.name, m.price, m.category])]
    );

    const [stockResult] = await pool.query(
      'INSERT IGNORE INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES ?',
      [STOCK_ITEMS.map((s) => [s.name, s.unit, 0, s.minLevel])]
    );

    console.log(`Manager account: ${userResult.affectedRows ? 'created' : 'already exists'}`);
    if (userResult.affectedRows) {
      console.log(`  login: ${manager.email || manager.username}  /  password: ${managerPassword} (change on first login)`);
    }
    console.log(`Menu items added: ${menuResult.affectedRows}`);
    console.log(`Stock items added: ${stockResult.affectedRows}`);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
