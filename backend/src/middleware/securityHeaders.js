/**
 * @file securityHeaders.js
 * @description A few hardening response headers (no external dependency).
 * This is a JSON API, so the heavy web-page CSP headers aren't needed; these
 * are the ones that still matter for an API.
 */

'use strict';

/** @type {import('express').RequestHandler} */
function securityHeaders(req, res, next) {
  // Don't let browsers guess content types.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // This API is never meant to be shown inside a frame.
  res.setHeader('X-Frame-Options', 'DENY');
  // Don't leak the API URL in a Referer header.
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Only same-site pages may read responses cross-origin.
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
}

module.exports = securityHeaders;
