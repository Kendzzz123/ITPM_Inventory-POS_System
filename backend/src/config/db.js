/**
 * @file db.js
 * @description Shared MySQL connection pool.
 * Works for the MySQL on the shop PC and for an online MySQL (DB_SSL, DB_TIMEZONE in .env).
 */

'use strict';

const fs = require('fs');
const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * Rebuilds a PEM certificate that was pasted with spaces or a literal "\n" instead of line
 * breaks (common when pasting into a one-line box on a hosting dashboard).
 * @param {string} text
 * @returns {string|undefined}
 */
function normalizePem(text) {
  const blocks = String(text)
    .replace(/\\n/g, '\n')
    .match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!blocks) return undefined;
  return blocks
    .map((block) => {
      const body = block
        .replace('-----BEGIN CERTIFICATE-----', '')
        .replace('-----END CERTIFICATE-----', '')
        .replace(/\s+/g, '');
      return `-----BEGIN CERTIFICATE-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
    })
    .join('\n');
}

/** TLS settings for an online database, or undefined for the local one. */
function sslOptions() {
  if (!env.DB_SSL) return undefined;
  const raw = env.DB_SSL_CA_FILE ? fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8') : env.DB_SSL_CA;
  if (!raw) {
    console.warn('[db] DB_SSL is on without DB_SSL_CA: the connection is encrypted, but the server certificate is not checked.');
    return { rejectUnauthorized: false };
  }
  const ca = normalizePem(raw);
  if (!ca) throw new Error('DB_SSL_CA is not a certificate. Paste the whole "-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----" text.');
  return { ca, rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DECIMAL columns (prices, quantities, totals) as JS numbers, not strings.
  decimalNumbers: true,
  // Stored procedures + session variables (@o_order_id) need this.
  multipleStatements: false,
});

// Online MySQL runs on UTC: give every new connection the shop's time zone, so
// "Today", sale times and waste dates are PH time. (Queued before any other query.)
if (env.DB_TIMEZONE) {
  pool.on('connection', (connection) => {
    connection.query('SET time_zone = ?', [env.DB_TIMEZONE]);
  });
}

module.exports = pool;
module.exports.normalizePem = normalizePem;

// TEST: normalizePem('-----BEGIN CERTIFICATE----- MIIB AAA= -----END CERTIFICATE-----') -> PEM with real line breaks
// TEST: DB_TIMEZONE=+08:00 -> SELECT @@session.time_zone is '+08:00' on every pooled connection
