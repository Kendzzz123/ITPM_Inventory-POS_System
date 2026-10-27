/**
 * @file helpers.js
 * @description Small shared helpers (dates, ids, validation).
 */

'use strict';

const crypto = require('crypto');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Converts "MM/DD/YYYY" (what the app sends) to "YYYY-MM-DD" for MySQL.
 * Returns null for empty input; throws 400 for malformed dates.
 * @param {string|undefined|null} value
 * @returns {string|null}
 */
function slashDateToSql(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new HttpError(400, 'Dates must be in MM/DD/YYYY format.');
  const [, mm, dd, yyyy] = match;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== Number(dd)) {
    throw new HttpError(400, `Invalid date: ${value}`);
  }
  return iso;
}

/** Idempotency key for orders / waste (CHAR(36) in the schema). */
function newRequestId(clientRequestId) {
  if (typeof clientRequestId === 'string' && /^[0-9a-f-]{36}$/i.test(clientRequestId)) {
    return clientRequestId;
  }
  return crypto.randomUUID();
}

/**
 * Parses a positive number or throws 400.
 * @param {unknown} value
 * @param {string} label
 */
function positiveNumber(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new HttpError(400, `${label} must be greater than 0.`);
  return n;
}

/** Positive integer id from a route param. */
function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id.');
  return n;
}

/** Basic email check that matches the DB constraint. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

module.exports = { slashDateToSql, newRequestId, positiveNumber, idParam, isValidEmail };

// TEST: slashDateToSql('3/4/2022') === '2022-03-04'; slashDateToSql('02/30/2024') throws 400
// TEST: newRequestId keeps a valid UUID and generates one otherwise
