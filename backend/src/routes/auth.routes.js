/**
 * @file auth.routes.js
 * @description Public auth endpoints: login and the forgot-password OTP flow.
 *   POST /auth/login
 *   POST /auth/forgot-password
 *   POST /auth/verify-otp
 *   POST /auth/reset-password
 */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const env = require('../config/env');
const { sendOtpEmail } = require('../config/mailer');
const { signToken } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 6;
// bcrypt only uses the first 72 bytes; also stops huge-input CPU waste.
const MAX_PASSWORD_LENGTH = 72;

/**
 * A fixed bcrypt hash, compared against when the email is unknown so a wrong
 * email takes the same time as a wrong password. Without this, "no such user"
 * returns faster than "wrong password", letting an attacker discover which
 * emails/usernames exist by timing the response.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 10);

// Brute-force guards (per IP). Limits are configurable in .env.
const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_WINDOW_MIN * 60 * 1000,
  max: env.LOGIN_RATE_MAX,
  message: 'Too many attempts. Please wait a few minutes and try again.',
});
const otpRequestLimiter = rateLimit({
  windowMs: env.OTP_REQUEST_RATE_WINDOW_MIN * 60 * 1000,
  max: env.OTP_REQUEST_RATE_MAX,
  message: 'Too many reset requests. Please wait a few minutes and try again.',
});

/** Rejects a password longer than bcrypt can use. */
function assertPasswordLength(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
  }
}

/**
 * Lifts a timed suspension whose end date has passed.
 * @param {{ User_ID: number, Status: string, Suspended_Until: Date|null }} user
 * @returns {Promise<boolean>} true if the account is (now) active
 */
async function refreshSuspension(user) {
  if (user.Status !== 'suspended') return true;
  if (user.Suspended_Until && new Date(user.Suspended_Until) <= new Date()) {
    await pool.query(
      "UPDATE Users SET Status = 'active', Suspended_Until = NULL WHERE User_ID = ?",
      [user.User_ID]
    );
    user.Status = 'active';
    return true;
  }
  return false;
}

/** Finds an active user by email (used by the OTP flow). */
async function findActiveUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT User_ID, Name, Status, Suspended_Until FROM Users WHERE Email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  if (!user || !(await refreshSuspension(user))) return null;
  return user;
}

/** Latest open password-reset OTP for a user. */
async function findOpenOtp(userId) {
  const [codes] = await pool.query(
    `SELECT OTP_ID, Code_Hash, Attempts, Expires_At
       FROM OTP_Codes
      WHERE User_ID = ? AND Purpose = 'password_reset' AND Closed_At IS NULL
      ORDER BY OTP_ID DESC LIMIT 1`,
    [userId]
  );
  return codes[0] || null;
}

/** Closes an OTP row with a reason ('used' | 'superseded' | 'locked'). */
function closeOtp(otpId, reason) {
  return pool.query('UPDATE OTP_Codes SET Closed_At = NOW(), Closed_Reason = ? WHERE OTP_ID = ?', [
    reason,
    otpId,
  ]);
}

/**
 * Validates an OTP. Increments attempts on a wrong code and locks
 * expired / over-attempted codes. Throws HttpError(400) when invalid.
 */
async function assertValidOtp(userId, otp) {
  // Every failure path returns the SAME message. Otherwise an attacker could
  // tell "wrong code" (so this email has a reset in progress → account exists)
  // apart from "no code" (no such account), which enumerates registered emails.
  // The attempt counter still increments and locks after OTP_MAX_ATTEMPTS.
  const INVALID = 'Invalid or expired code. Please request a new one.';

  const active = await findOpenOtp(userId);
  if (!active) throw new HttpError(400, INVALID);

  if (new Date() > new Date(active.Expires_At)) {
    await closeOtp(active.OTP_ID, 'locked');
    throw new HttpError(400, INVALID);
  }
  if (active.Attempts >= OTP_MAX_ATTEMPTS) {
    await closeOtp(active.OTP_ID, 'locked');
    throw new HttpError(400, INVALID);
  }

  const isMatch = await bcrypt.compare(String(otp), active.Code_Hash);
  if (!isMatch) {
    await pool.query('UPDATE OTP_Codes SET Attempts = Attempts + 1 WHERE OTP_ID = ?', [active.OTP_ID]);
    throw new HttpError(400, INVALID);
  }
  return active;
}

// POST /auth/login — Email or Username + password
router.post('/login', loginLimiter, async (req, res) => {
  const { email, username, password } = req.body ?? {};
  const identifier = String(email || username || '').trim();

  if (!identifier || !password) {
    throw new HttpError(400, 'Please enter your email and password.');
  }

  const [rows] = await pool.query(
    'SELECT * FROM Users WHERE Email = ? OR Username = ? LIMIT 1',
    [identifier, identifier]
  );
  const user = rows[0];

  // Always run one bcrypt compare (dummy hash when the user is missing) so the
  // response takes the same time whether the account exists or not, and give
  // the same message either way — no user enumeration by timing or wording.
  const passwordOk = await bcrypt.compare(String(password), user ? user.Password_Hash : DUMMY_HASH);
  if (!user || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  if (!(await refreshSuspension(user))) {
    const until = user.Suspended_Until
      ? ` until ${new Date(user.Suspended_Until).toLocaleDateString('en-US')}`
      : '';
    throw new HttpError(403, `Your account is currently suspended${until}.`);
  }

  return res.json({
    message: 'Login successful',
    token: signToken(user),
    mustChangePassword: env.DEFAULT_STAFF_PASSWORDS.includes(String(password)),
    user: {
      id: user.User_ID,
      name: user.Name,
      username: user.Username,
      email: user.Email,
      role: user.Role,
    },
  });
});

// POST /auth/forgot-password — emails a 6-digit code
router.post('/forgot-password', otpRequestLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!email) throw new HttpError(400, 'Email is required.');

  // Always reply the same way, whether or not the email is registered, so this
  // endpoint can't be used to find out which emails have accounts.
  const genericReply = () =>
    res.json({ message: 'If that email is registered, a verification code has been sent.' });

  const user = await findActiveUserByEmail(email);
  if (!user) return genericReply();

  const otp = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE OTP_Codes SET Closed_At = NOW(), Closed_Reason = 'superseded'
        WHERE User_ID = ? AND Purpose = 'password_reset' AND Closed_At IS NULL`,
      [user.User_ID]
    );
    await conn.query(
      `INSERT INTO OTP_Codes (User_ID, Code_Hash, Purpose, Expires_At)
       VALUES (?, ?, 'password_reset', ?)`,
      [user.User_ID, codeHash, expiresAt]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  try {
    await sendOtpEmail({ to: email, name: user.Name, otp });
  } catch (err) {
    // Log for the owner, but still reply generically so the response is uniform.
    console.error('[forgot-password] email failed:', err.message);
  }

  return genericReply();
});

// POST /auth/verify-otp
router.post('/verify-otp', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim();
  const otp = String(req.body?.otp || '').trim();
  if (!email || !otp) throw new HttpError(400, 'Email and code are required.');

  const user = await findActiveUserByEmail(email);
  // Same generic 400 as a bad code, so a missing account isn't distinguishable.
  if (!user) throw new HttpError(400, 'Invalid or expired code. Please request a new one.');

  await assertValidOtp(user.User_ID, otp);
  return res.json({ message: 'OTP verified successfully' });
});

// POST /auth/reset-password
router.post('/reset-password', loginLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim();
  const otp = String(req.body?.otp || '').trim();
  const newPassword = String(req.body?.newPassword || '');

  if (!email || !otp || !newPassword) {
    throw new HttpError(400, 'Email, code, and new password are required.');
  }
  assertPasswordLength(newPassword);

  const user = await findActiveUserByEmail(email);
  if (!user) throw new HttpError(400, 'Invalid or expired code. Please request a new one.');

  const active = await assertValidOtp(user.User_ID, otp);
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await pool.query('UPDATE Users SET Password_Hash = ? WHERE User_ID = ?', [passwordHash, user.User_ID]);
  await closeOtp(active.OTP_ID, 'used');

  return res.json({ message: 'Password updated successfully! You can now log in.' });
});

module.exports = router;
module.exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
module.exports.MAX_PASSWORD_LENGTH = MAX_PASSWORD_LENGTH;
module.exports.assertPasswordLength = assertPasswordLength;

// TEST: login -> 400 missing fields, 401 wrong password, 403 suspended, 200 with token
// TEST: login with a default password returns mustChangePassword = true
// TEST: verify-otp increments Attempts on wrong code and locks after 5
// TEST: reset-password marks the OTP 'used' so it cannot be replayed
