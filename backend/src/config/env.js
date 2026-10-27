/**
 * @file env.js
 * @description Single source of truth for backend configuration.
 * Every other module reads settings from here instead of process.env,
 * so a missing/misspelled variable is caught in one place.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Reads an env var and falls back to a default.
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string|undefined}
 */
function read(key, fallback) {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

const env = {
  PORT: Number(read('PORT', '3000')),

  DB_HOST: read('DB_HOST', 'localhost'),
  DB_PORT: Number(read('DB_PORT', '3306')),
  DB_USER: read('DB_USER', 'root'),
  DB_PASSWORD: read('DB_PASSWORD', ''),
  DB_NAME: read('DB_NAME', 'myapp_db'),

  JWT_SECRET: read('JWT_SECRET'),
  JWT_EXPIRES_IN: read('JWT_EXPIRES_IN', '1d'),

  EMAIL_USER: read('EMAIL_USER'),
  EMAIL_PASS: read('EMAIL_PASS'),

  /**
   * Passwords given to brand-new staff accounts. Logging in with one of these
   * forces the "Change Password" screen. Comma separated in .env.
   */
  DEFAULT_STAFF_PASSWORDS: read('DEFAULT_STAFF_PASSWORDS', 'Mr.liempo123,password123')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),
};

if (!env.JWT_SECRET) {
  // Fail fast: signing and verifying with different fallback secrets was the
  // cause of "Invalid or expired token" on every request.
  throw new Error('JWT_SECRET is missing. Add it to backend/.env (see .env.example).');
}

module.exports = env;

// TEST: throws when JWT_SECRET is not set
// TEST: DEFAULT_STAFF_PASSWORDS splits and trims comma separated values
