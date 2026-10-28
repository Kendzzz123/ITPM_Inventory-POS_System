/**
 * @file catalog.js
 * @description Starting menu, stock items and portions for Mr. Liempo.
 * Used by database/seed.js and the automatic upgrade in ensureSchema.js.
 * Prices and portions can be changed later in the app (Manage Price -> Edit Price).
 */

'use strict';

/** Menu as posted in the store. */
const MENU_ITEMS = [
  { name: 'Whole Juicy Chicken', price: 320, category: 'Chicken' },
  { name: 'Half Juicy Chicken', price: 165, category: 'Chicken' },
  { name: 'Liempo', price: 285, category: 'Pork' },
  { name: 'Regular Chorizo', price: 140, category: 'Chorizo' },
  { name: 'Spicy Chorizo', price: 145, category: 'Chorizo' },
  { name: 'Atsara', price: 25, category: 'Sides' },
  { name: 'Sarsa (Gravy)', price: 7, category: 'Sides' },
];

/** Inventory tracked in Stocks / Restock / Record Waste. */
const STOCK_ITEMS = [
  { name: 'Raw Chicken', unit: 'pcs', minLevel: 10 },
  { name: 'Raw Pork', unit: 'kg', minLevel: 5 },
  { name: 'Regular Chorizo', unit: 'packs', minLevel: 10 },
  { name: 'Spicy Chorizo', unit: 'packs', minLevel: 10 },
  { name: 'Atsara', unit: 'packs', minLevel: 10 },
  { name: 'Sarsa (Gravy)', unit: 'L', minLevel: 2 },
];

/**
 * How much stock ONE order of a menu item uses (starting guesses — adjust in
 * Edit Price). Example: 1 Whole Juicy Chicken uses 1 pc Raw Chicken; a Half
 * uses 0.5, so 10 chickens in stock = 10 wholes or 20 halves.
 */
const DEFAULT_PORTIONS = [
  { item: 'Whole Juicy Chicken', stock: 'Raw Chicken', quantityUsed: 1 },
  { item: 'Half Juicy Chicken', stock: 'Raw Chicken', quantityUsed: 0.5 },
  { item: 'Liempo', stock: 'Raw Pork', quantityUsed: 0.25 },
  { item: 'Regular Chorizo', stock: 'Regular Chorizo', quantityUsed: 1 },
  { item: 'Spicy Chorizo', stock: 'Spicy Chorizo', quantityUsed: 1 },
  { item: 'Atsara', stock: 'Atsara', quantityUsed: 1 },
  { item: 'Sarsa (Gravy)', stock: 'Sarsa (Gravy)', quantityUsed: 0.05 },
];

module.exports = { MENU_ITEMS, STOCK_ITEMS, DEFAULT_PORTIONS };
