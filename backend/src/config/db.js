/**
 * @file db.js
 * @description Shared MySQL connection pool.
 */

'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DECIMAL columns (prices, quantities, totals) as JS numbers, not strings.
  decimalNumbers: true,
  // Stored procedures + session variables (@o_order_id) need this.
  multipleStatements: false,
});

module.exports = pool;
