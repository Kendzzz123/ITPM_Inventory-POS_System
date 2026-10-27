/**
 * @file server.js
 * @description Entry point: `npm start` (or `node server.js`).
 * Routes live in src/routes, configuration in src/config, and the
 * database scripts in database/.
 */

'use strict';

const app = require('./src/app');
const pool = require('./src/config/db');
const env = require('./src/config/env');
const ensureSchema = require('./src/config/ensureSchema');

const server = app.listen(env.PORT, '0.0.0.0', async () => {
  console.log(`Server listening on http://0.0.0.0:${env.PORT}`);
  try {
    const connection = await pool.getConnection();
    console.log(`Connected to MySQL database "${env.DB_NAME}".`);
    connection.release();
  } catch (err) {
    console.error('Initial DB connection error:', err.message);
    return;
  }
  try {
    await ensureSchema();
  } catch (err) {
    console.error('Could not update the database automatically:', err.message);
    console.error('Run backend/database/migrations/001_add_suspended_until.sql manually.');
  }
});

// Close the HTTP server and DB pool cleanly on Ctrl+C / container stop.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
}
