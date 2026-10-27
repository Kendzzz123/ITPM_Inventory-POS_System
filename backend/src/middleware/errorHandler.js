/**
 * @file errorHandler.js
 * @description Central error handling. Route handlers can simply `throw`
 * (Express 5 forwards rejected promises here automatically).
 */

'use strict';

/** Error with an HTTP status that is safe to show to the user. */
class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Maps common MySQL errors to friendly messages. */
function friendlySqlMessage(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    if (/email/i.test(err.sqlMessage)) return 'That email is already used by another account.';
    if (/username/i.test(err.sqlMessage)) return 'That username is already taken.';
    if (/menu_name|Item_Name/i.test(err.sqlMessage)) return 'A menu item with that name already exists.';
    return 'This record already exists.';
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return 'This record is linked to existing transactions and cannot be deleted.';
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return 'Some values are invalid. Please check your input.';
  }
  // Messages raised by SIGNAL in the stored procedures (e.g. "Insufficient stock")
  if (err.sqlState === '45000' && err.sqlMessage) return err.sqlMessage;
  return null;
}

/** 404 for unknown routes. */
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** @type {import('express').ErrorRequestHandler} */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }
  const sqlMessage = friendlySqlMessage(err);
  if (sqlMessage) {
    return res.status(400).json({ message: sqlMessage });
  }
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ message: 'Something went wrong on the server.' });
}

module.exports = { HttpError, notFound, errorHandler };
