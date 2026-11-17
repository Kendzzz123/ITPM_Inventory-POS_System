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

  /** Online databases (Aiven, ...) need an encrypted connection: DB_SSL=true. */
  DB_SSL: ['1', 'true', 'yes'].includes(String(read('DB_SSL', '')).toLowerCase()),
  /**
   * The database's CA certificate, to check it is really your server. Paste the
   * PEM text (line breaks may become spaces, that's fine) or give a file path.
   */
  DB_SSL_CA: read('DB_SSL_CA'),
  DB_SSL_CA_FILE: read('DB_SSL_CA_FILE'),
  /**
   * Time zone for MySQL dates (NOW(), CURDATE(), "Today" filters), e.g. +08:00.
   * Leave empty on the shop PC (MySQL already uses PH time); set it online,
   * where servers run on UTC. Also set TZ=Asia/Manila there for Node.
   */
  DB_TIMEZONE: read('DB_TIMEZONE'),

  /**
   * Behind a hosting proxy (Render, ...) set TRUST_PROXY=1 so the login limits
   * see each phone's own IP instead of the proxy's. Leave 0 on the shop Wi-Fi.
   */
  TRUST_PROXY: Number(read('TRUST_PROXY', '0')) || 0,

  JWT_SECRET: read('JWT_SECRET'),
  JWT_EXPIRES_IN: read('JWT_EXPIRES_IN', '1d'),

  EMAIL_USER: read('EMAIL_USER'),
  EMAIL_PASS: read('EMAIL_PASS'),
  /**
   * Online only: Render's free plan blocks Gmail's mail ports, so codes are sent
   * through a small Google Apps Script web app on the shop Gmail instead
   * (backend/docs/email-relay.gs). Leave both empty on the shop PC.
   */
  EMAIL_RELAY_URL: read('EMAIL_RELAY_URL'),
  EMAIL_RELAY_SECRET: read('EMAIL_RELAY_SECRET'),

  /**
   * Passwords given to brand-new staff accounts. Logging in with one of these
   * forces the "Change Password" screen. Comma separated in .env.
   */
  DEFAULT_STAFF_PASSWORDS: read('DEFAULT_STAFF_PASSWORDS', 'Mr.liempo123,password123')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),

  /**
   * Allowed browser origins for CORS. Comma separated in .env, e.g.
   * "http://localhost:8081,https://pos.example.com". Leave empty to allow any
   * origin (the default — a native mobile app doesn't send an Origin header,
   * so this only matters if you also use the API from a website).
   */
  CORS_ORIGINS: (read('CORS_ORIGINS', '') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  /** Brute-force limits for the login / OTP endpoints (per IP). */
  LOGIN_RATE_MAX: Number(read('LOGIN_RATE_MAX', '20')),
  LOGIN_RATE_WINDOW_MIN: Number(read('LOGIN_RATE_WINDOW_MIN', '15')),
  OTP_REQUEST_RATE_MAX: Number(read('OTP_REQUEST_RATE_MAX', '5')),
  OTP_REQUEST_RATE_WINDOW_MIN: Number(read('OTP_REQUEST_RATE_WINDOW_MIN', '15')),

  /** bcrypt work factor for hashing passwords (higher = slower = safer). */
  BCRYPT_ROUNDS: Number(read('BCRYPT_ROUNDS', '12')),

  /** 'production' hides stack traces from server logs sent to clients. */
  NODE_ENV: read('NODE_ENV', 'development'),
};

if (!env.JWT_SECRET) {
  // Fail fast: signing and verifying with different fallback secrets was the
  // cause of "Invalid or expired token" on every request.
  throw new Error('JWT_SECRET is missing. Add it to backend/.env (see .env.example).');
}

if (env.JWT_SECRET.length < 32) {
  // A short secret is guessable, which lets an attacker forge login tokens.
  console.warn(
    '[security] JWT_SECRET is short. Use a long random value, e.g.\n' +
      '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

module.exports = env;

// TEST: throws when JWT_SECRET is not set
// TEST: DEFAULT_STAFF_PASSWORDS splits and trims comma separated values
// TEST: CORS_ORIGINS parses a comma list and is [] when unset
// TEST: DB_SSL=true -> true; unset -> false; TRUST_PROXY unset -> 0
