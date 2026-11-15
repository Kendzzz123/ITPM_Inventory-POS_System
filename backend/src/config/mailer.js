/**
 * @file mailer.js
 * @description Sends the password-reset (OTP) emails.
 *
 * Two ways, picked automatically:
 *  - EMAIL_RELAY_URL set (online server): an HTTPS call to a Google Apps Script
 *    web app on the shop Gmail (backend/docs/email-relay.gs). Needed on Render's
 *    free plan, which blocks the normal mail ports (25, 465, 587).
 *  - Otherwise (shop PC): Gmail directly with EMAIL_USER + EMAIL_PASS (app password).
 */

'use strict';

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  // Fail within seconds instead of hanging for minutes when mail ports are blocked.
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

/**
 * Sends one email through the Apps Script relay.
 * @param {{ to: string, subject: string, html: string }} message
 */
async function sendViaRelay({ to, subject, html }) {
  const res = await fetch(env.EMAIL_RELAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: env.EMAIL_RELAY_SECRET, to, subject, html, name: 'Mr. Liempo POS' }),
    redirect: 'follow', // Apps Script answers through a redirect
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let reply = null;
  try {
    reply = JSON.parse(text);
  } catch {
    // not JSON: usually a Google sign-in or error page (wrong URL or access setting)
  }
  if (!res.ok || !reply || reply.ok !== true) {
    throw new Error(`Email relay failed (${res.status}): ${reply?.error || text.slice(0, 120)}`);
  }
}

/**
 * Sends the 6-digit password reset code.
 * @param {{ to: string, name: string, otp: string }} args
 */
async function sendOtpEmail({ to, name, otp }) {
  const subject = 'Your Password Reset Code';
  const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello <b>${escapeHtml(name)}</b>,</p>
        <p>Use the following 6-digit verification code to reset your password:</p>
        <h1 style="color: #EC0000; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `;

  if (env.EMAIL_RELAY_URL) {
    if (!env.EMAIL_RELAY_SECRET) throw new Error('EMAIL_RELAY_SECRET is missing (it must match the relay script).');
    return sendViaRelay({ to, subject, html });
  }
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error('Email is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.');
  }
  await transporter.sendMail({ from: `"Mr. Liempo POS" <${env.EMAIL_USER}>`, to, subject, html });
}

/** @param {string} value */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

module.exports = { sendOtpEmail };

// TEST: EMAIL_RELAY_URL set -> one HTTPS POST with { secret, to, subject, html }; reply {ok:true} = sent, anything else throws
// TEST: no relay + Gmail ports blocked -> fails in about 10 s instead of hanging (route still answers generically)
