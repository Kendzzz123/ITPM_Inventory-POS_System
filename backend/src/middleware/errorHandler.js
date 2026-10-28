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

/** 404 for unknown routes. Don't reflect the requested path back to the client. */
function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

/** @type {import('express').ErrorRequestHandler} */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  // Body-parser errors (express.json): too large, malformed, wrong charset.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }
  if (err.type === 'charset.unsupported' || err.type === 'encoding.unsupported') {
    return res.status(415).json({ message: 'Unsupported content encoding.' });
  }
  const sqlMessage = friendlySqlMessage(err);
  if (sqlMessage) {
    return res.status(400).json({ message: sqlMessage });
  }
  // Log a concise line (no request body, no SQL values) so credentials and
  // personal data never land in the logs. Show the stack only outside production.
  const where = `[${req.method} ${req.originalUrl}]`;
  if (process.env.NODE_ENV === 'production') {
    console.error(`${where} ${err.code || ''} ${err.message}`);
  } else {
    console.error(`${where} ${err.code || ''} ${err.message}\n${err.stack || ''}`);
  }
  return res.status(500).json({ message: 'Something went wrong on the server.' });
}

module.exports = { HttpError, notFound, errorHandler };
