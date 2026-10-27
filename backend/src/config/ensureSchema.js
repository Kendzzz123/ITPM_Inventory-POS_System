/**
 * @file ensureSchema.js
 * @description Small automatic upgrades for databases created from an older
 * pos_schema.sql, run once when the server starts. Without this, screens that
 * read newer columns (e.g. Staff Management -> Suspended_Until) failed with
 * "Something went wrong on the server".
 */

'use strict';

const pool = require('./db');

/** Columns that newer code needs: [table, column, definition]. */
const REQUIRED_COLUMNS = [
  ['Users', 'Suspended_Until', 'DATETIME NULL AFTER Employment_Date'],
];

async function ensureSchema() {
  for (const [table, column, definition] of REQUIRED_COLUMNS) {
    const [rows] = await pool.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`Database updated: added ${table}.${column}`);
    }
  }
}

module.exports = ensureSchema;
