/**
 * @file initDatabase.js
 * @description First start on an EMPTY database (for example a new online MySQL):
 * creates the tables, triggers and stored procedures from database/pos_schema.sql
 * and the first manager login, so nothing has to be imported by hand.
 * Does nothing when the tables already exist (your PC's database is left alone).
 * The menu and stock items are added right after by ensureSchema().
 */

'use strict';

const bcrypt = require('bcryptjs');
const pool = require('./db');
const env = require('./env');
const { schemaStatements } = require('../utils/sqlFile');

/** MySQL refuses triggers for users without SUPER when binary logging is on (1419 / 1227). */
const TRIGGER_NOT_ALLOWED = new Set([1419, 1227]);

/**
 * Creates the schema and the manager when the database has no tables yet.
 * @returns {Promise<boolean>} true if the database was set up now
 */
async function initDatabase() {
  const [[{ n }]] = await pool.query(
    `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'`
  );
  if (n > 0) return false;

  console.log('Empty database: creating the tables from database/pos_schema.sql ...');
  let skippedTriggers = 0;
  // One connection for the whole file: SET FOREIGN_KEY_CHECKS applies per connection.
  const conn = await pool.getConnection();
  try {
    for (const sql of schemaStatements()) {
      try {
        await conn.query(sql);
      } catch (err) {
        if (/^CREATE\s+TRIGGER/i.test(sql) && TRIGGER_NOT_ALLOWED.has(err.errno)) {
          skippedTriggers += 1;
          continue;
        }
        throw new Error(
          `Database setup stopped at: ${sql.split('\n')[0].slice(0, 80)} -> ${err.message}. ` +
            'Empty the database (drop all tables) and start the server again.'
        );
      }
    }
  } finally {
    conn.release();
  }
  if (skippedTriggers > 0) {
    console.warn(
      `[db] ${skippedTriggers} history-protection triggers were not created (this database user ` +
        'is not allowed to). The app works the same; the database just does not block manual edits of history.'
    );
  }

  const manager = {
    name: process.env.SEED_MANAGER_NAME || 'Store Manager',
    username: process.env.SEED_MANAGER_USERNAME || 'manager',
    email: process.env.SEED_MANAGER_EMAIL || env.EMAIL_USER || null,
  };
  const hash = await bcrypt.hash(env.DEFAULT_STAFF_PASSWORDS[0], env.BCRYPT_ROUNDS);
  await pool.query(
    `INSERT IGNORE INTO Users (Name, Username, Password_Hash, Role, Status, Email, Employment_Date)
     VALUES (?, ?, ?, 'manager', 'active', ?, CURDATE())`,
    [manager.name, manager.username, hash, manager.email]
  );
  console.log(
    `Database created. Manager login: ${manager.email || manager.username} ` +
      '(the first DEFAULT_STAFF_PASSWORDS value; you must change it on first login).'
  );
  return true;
}

module.exports = initDatabase;

// TEST: empty database -> 12 tables, 5 procedures, 9 triggers (or 0 with a warning when not allowed) and 1 manager
// TEST: database that already has Users -> returns false and changes nothing
