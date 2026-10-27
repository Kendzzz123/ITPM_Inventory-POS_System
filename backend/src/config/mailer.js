/**
 * @file mailer.js
 * @description Nodemailer transport used for OTP emails.
 */

'use strict';

const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
});

/**
 * Sends the 6-digit password reset code.
 * @param {{ to: string, name: string, otp: string }} args
 */
async function sendOtpEmail({ to, name, otp }) {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error('Email is not configured. Set EMAIL_USER and EMAIL_PASS in backend/.env.');
  }
  await transporter.sendMail({
    from: `"Mr. Liempo POS" <${env.EMAIL_USER}>`,
    to,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello <b>${escapeHtml(name)}</b>,</p>
        <p>Use the following 6-digit verification code to reset your password:</p>
        <h1 style="color: #EC0000; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

/** @param {string} value */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

module.exports = { sendOtpEmail };
