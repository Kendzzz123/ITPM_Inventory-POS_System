/**
 * @file rateLimit.js
 * @description Tiny in-memory rate limiter — no external dependency.
 * Slows brute-force attacks on login / OTP and blunts request floods.
 *
 * Keyed by client IP. Fine for a single LAN server; for a multi-instance
 * deployment behind a load balancer, swap the Map for a shared store (Redis)
 * and set `app.set('trust proxy', 1)` so req.ip is the real client.
 */

'use strict';

/**
 * @param {object} opts
 * @param {number} opts.windowMs  Size of the sliding window, in ms.
 * @param {number} opts.max       Max requests allowed per IP per window.
 * @param {string} [opts.message] 429 body message.
 * @returns {import('express').RequestHandler & { reset: () => void }}
 */
function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  /** @type {Map<string, number[]>} ip -> request timestamps (ms) within the window */
  const hits = new Map();

  // Drop stale entries so memory can't grow unbounded.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, times] of hits) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length) hits.set(key, kept);
      else hits.delete(key);
    }
  }, windowMs);
  if (sweep.unref) sweep.unref(); // never keep the process alive just for cleanup

  /** @type {any} */
  const middleware = (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const cutoff = now - windowMs;
    const times = (hits.get(key) || []).filter((t) => t > cutoff);

    if (times.length >= max) {
      const retrySec = Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({ message });
    }

    times.push(now);
    hits.set(key, times);
    return next();
  };

  // For tests: clear all counters.
  middleware.reset = () => hits.clear();
  return middleware;
}

module.exports = rateLimit;

// TEST: the 4th request within the window to a max:3 limiter returns 429 with Retry-After
// TEST: a request after the window elapses is allowed again
