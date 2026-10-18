require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'pos_sample',
  });

  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    // Matches pos_schema.sql: User_ID, Name, Username, Password_Hash, Role, Status, Email, Employment_Date
    await pool.query(`
      INSERT INTO Users (Name, Username, Password_Hash, Role, Status, Email, Employment_Date)
      VALUES 
        ('Alice Manager', 'manager', ?, 'manager', 'active', 'manager@example.com', CURDATE()),
        ('Bob Cashier', 'cashier', ?, 'cashier', 'active', 'cashier@example.com', CURDATE())
      ON DUPLICATE KEY UPDATE 
        Password_Hash = VALUES(Password_Hash),
        Status = VALUES(Status),
        Role = VALUES(Role)
    `, [passwordHash, passwordHash]);

    console.log('✅ Users seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();