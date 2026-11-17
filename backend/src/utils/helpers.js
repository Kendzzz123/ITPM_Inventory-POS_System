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

/**
 * Today's date as "YYYY-MM-DD" in the server's own time zone (PH time on the
 * shop PC). toISOString() would give the UTC date, which is still "yesterday"
 * between 12:00 and 8:00 AM in the Philippines.
 * @param {Date} [date]
 * @returns {string}
 */
function localDateSql(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
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

/** Characters a name may use: letters (incl. ñ, é, ...), digits, space, period, apostrophe, hyphen. */
const NAME_CHARS = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .'-]+$/;
const STARTS_WITH_LETTER = /^[A-Za-zÀ-ÖØ-öø-ÿ]/;
/** A number inside a name must be its own word: "8" or "8." (as in "Jennifer 8. Lee"). */
const NUMBER_WORD = /^\d+\.?$/;

/**
 * Guard: a person's name. Letters, spaces and . ' - are fine. A number is allowed
 * only as its own part of the name, like "Jennifer 8. Lee"; a number stuck to a
 * word ("Juan2") or a name that is only numbers ("12345") is refused.
 * Same rules as the app (frontend/src/utils/validation.ts).
 * @param {string} name already trimmed
 */
function assertValidName(name) {
  if (!NAME_CHARS.test(name)) {
    throw new HttpError(
      400,
      "Name can only contain letters, numbers, spaces, periods (.), apostrophes (') and hyphens (-)."
    );
  }
  if (!STARTS_WITH_LETTER.test(name)) throw new HttpError(400, 'Name must start with a letter.');
  const mixedWord = name.split(/\s+/).find((word) => /\d/.test(word) && !NUMBER_WORD.test(word));
  if (mixedWord) {
    throw new HttpError(
      400,
      `A number in a name must be on its own, like "Jennifer 8. Lee" ("${mixedWord}" mixes letters and numbers).`
    );
  }
  if (name.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').length < 2) {
    throw new HttpError(400, 'Name must have at least 2 letters.');
  }
}

/**
 * Guard: Philippine mobile number, in one of two forms:
 *   09XXXXXXXXX   — 11 digits, starts with 09   (e.g. 09171234567)
 *   +639XXXXXXXXX — 13 characters, starts with +639 (e.g. +639171234567)
 * No spaces or dashes. Both forms are the same number: +63 replaces the first 0.
 * @param {string} phone already trimmed
 */
function assertValidPhone(phone) {
  if (/[^\d+]/.test(phone)) {
    throw new HttpError(400, 'Contact number can only contain digits and a + at the start (no spaces or dashes).');
  }
  if (phone.lastIndexOf('+') > 0) {
    throw new HttpError(400, '"+" can only be at the start of the number (e.g. +639171234567).');
  }
  if (phone.startsWith('+')) {
    if (!phone.startsWith('+639')) {
      throw new HttpError(400, 'A number with + must start with +639 (e.g. +639171234567).');
    }
    if (phone.length !== 13) {
      throw new HttpError(400, `A +63 number must be 13 characters (you entered ${phone.length}), e.g. +639171234567.`);
    }
    return;
  }
  if (!phone.startsWith('09')) {
    throw new HttpError(400, 'Contact number must start with 09 or +639 (e.g. 09171234567 or +639171234567).');
  }
  if (phone.length !== 11) {
    throw new HttpError(400, `A 09 number must be exactly 11 digits (you entered ${phone.length}), e.g. 09171234567.`);
  }
}

module.exports = {
  slashDateToSql,
  localDateSql,
  newRequestId,
  positiveNumber,
  idParam,
  isValidEmail,
  assertValidName,
  assertValidPhone,
};

// TEST: slashDateToSql('3/4/2022') === '2022-03-04'; slashDateToSql('02/30/2024') throws 400
// TEST: localDateSql(new Date(2026, 10, 4, 1, 30)) === '2026-11-04' (local date, not UTC)
// TEST: newRequestId keeps a valid UUID and generates one otherwise
// TEST: assertValidName accepts "Juan Dela Cruz", "Ma. Peña-O'Neil", "Jennifer 8. Lee"; rejects "Juan2", "12345", "J", "Juan@"
// TEST: assertValidPhone accepts "09171234567" and "+639171234567"; rejects "+63917123456", "0917123456", "0917-123-4567", "19171234567", "639171234567"
