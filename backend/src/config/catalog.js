/**
 * @file catalog.js
 * @description Starting menu, stock items and portions for Mr. Liempo.
 * Used by database/seed.js and the automatic upgrade in ensureSchema.js.
 * Prices can be changed later in the app (Manage Price -> Edit Price).
 * Portions (how much stock one order uses) are set here only.
 *
 * To add an item: add it to MENU_ITEMS, STOCK_ITEMS and DEFAULT_PORTIONS with the
 * SAME name in all three, then restart the backend. New items are added to the
 * database on start (syncCatalog in ensureSchema.js); prices you already changed
 * in the app are never overwritten. A new item starts with 0
 * stock, so restock it before selling.
 */

'use strict';

/** Menu as posted in the store. */
const MENU_ITEMS = [
  { name: 'Whole Juicy Chicken', price: 320, category: 'Chicken' },
  { name: 'Half Juicy Chicken', price: 165, category: 'Chicken' },
  { name: 'Liempo', price: 285, category: 'Pork' },
  { name: 'Regular Chorizo', price: 140, category: 'Chorizo' },
  { name: 'Spicy Chorizo', price: 145, category: 'Chorizo' },
  { name: 'Chorizo De Cebu (Regular)', price: 140, category: 'Chorizo' },
  { name: 'Chorizo De Cebu (Spicy)', price: 140, category: 'Chorizo' },
  { name: 'Atsara', price: 25, category: 'Sides' },
  { name: 'Sarsa (Gravy)', price: 7, category: 'Sides' },
];

/**
 * Inventory tracked in Stocks / Restock / Record Waste. Stock items are the POS
 * menu items themselves (same names). A stock item whose name is not an active
 * menu item is hidden (Stock_Items.Is_Active = 0) — see migration 004.
 * Every menu item has its own stock, counted in whole numbers (pieces or packs):
 * Half Juicy Chicken is counted separately from Whole Juicy Chicken, and Sarsa
 * (Gravy) is counted in packs, not liters (migration 007).
 */
const STOCK_ITEMS = [
  { name: 'Whole Juicy Chicken', unit: 'pcs', minLevel: 10 },
  { name: 'Half Juicy Chicken', unit: 'pcs', minLevel: 10 },
  { name: 'Liempo', unit: 'pcs', minLevel: 10 },
  { name: 'Regular Chorizo', unit: 'packs', minLevel: 10 },
  { name: 'Spicy Chorizo', unit: 'packs', minLevel: 10 },
  { name: 'Chorizo De Cebu (Regular)', unit: 'packs', minLevel: 10 },
  { name: 'Chorizo De Cebu (Spicy)', unit: 'packs', minLevel: 10 },
  { name: 'Atsara', unit: 'packs', minLevel: 10 },
  { name: 'Sarsa (Gravy)', unit: 'packs', minLevel: 10 },
];

/** Units counted in whole numbers: restock, waste and stock never use fractions of these. */
const WHOLE_UNITS = ['pcs', 'packs'];

/**
 * How much stock ONE order of a menu item uses. Applied when an item is first
 * added; changing a number here later does not update an item already in the database.
 * Each order uses 1 of the item's own stock, so stock always stays a whole number.
 */
const DEFAULT_PORTIONS = [
  { item: 'Whole Juicy Chicken', stock: 'Whole Juicy Chicken', quantityUsed: 1 },
  { item: 'Half Juicy Chicken', stock: 'Half Juicy Chicken', quantityUsed: 1 },
  { item: 'Liempo', stock: 'Liempo', quantityUsed: 1 },
  { item: 'Regular Chorizo', stock: 'Regular Chorizo', quantityUsed: 1 },
  { item: 'Spicy Chorizo', stock: 'Spicy Chorizo', quantityUsed: 1 },
  { item: 'Chorizo De Cebu (Regular)', stock: 'Chorizo De Cebu (Regular)', quantityUsed: 1 },
  { item: 'Chorizo De Cebu (Spicy)', stock: 'Chorizo De Cebu (Spicy)', quantityUsed: 1 },
  { item: 'Atsara', stock: 'Atsara', quantityUsed: 1 },
  { item: 'Sarsa (Gravy)', stock: 'Sarsa (Gravy)', quantityUsed: 1 },
];

/**
 * Position of a name in MENU_ITEMS, so the POS and Stocks list items in menu
 * order (a new chorizo sits with the other chorizos). Unknown names go last.
 * @param {string} name
 * @returns {number}
 */
function menuOrder(name) {
  const i = MENU_ITEMS.findIndex((m) => m.name === name);
  return i === -1 ? MENU_ITEMS.length : i;
}

module.exports = { MENU_ITEMS, STOCK_ITEMS, DEFAULT_PORTIONS, WHOLE_UNITS, menuOrder };

// TEST: every DEFAULT_PORTIONS item and stock name exists in MENU_ITEMS / STOCK_ITEMS
// TEST: every STOCK_ITEMS unit is in WHOLE_UNITS and every DEFAULT_PORTIONS quantityUsed is a whole number
