require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const nodemailer = require('nodemailer');
app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// // 1. Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 2. Health check route
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    res.json({ status: 'ok', db: 'connected', result: rows[0].solution });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 3. Login Route (generates JWT)// 3. Login Route (matches pos_schema.sql)
app.post('/auth/login', async (req, res) => {
  const { email, username, identifier, password } = req.body;
  const loginHandle = email || username || identifier;

  if (!loginHandle || !password) {
    return res.status(400).json({ message: 'Email/Username and password are required' });
  }

  try {
    // Queries the new Users table with capital U, User_ID, and Password_Hash
    const [rows] = await pool.query(
      `SELECT User_ID, Name, Username, Email, Password_Hash, Role, Status 
       FROM Users 
       WHERE (Email = ? OR Username = ?) 
       LIMIT 1`,
      [loginHandle, loginHandle]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];

    // Check account status
    if (user.Status !== 'active') {
      return res.status(403).json({ message: 'Account is suspended' });
    }

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, user.Password_Hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.User_ID,
        username: user.Username,
        role: user.Role,
      },
      process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.User_ID,
        name: user.Name,
        username: user.Username,
        role: user.Role,
      },
    });
  } catch (error) {
    console.error('SQL Login Error:', error);
    return res.status(500).json({ message: 'Internal server error', detail: error.message });
  }
});
// POST /auth/forgot-password
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // 1. Verify user exists in mockpos database
    const [users] = await pool.query(
      'SELECT User_ID, Name FROM Users WHERE Email = ? AND Status = "active" LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'No active account found with this email' });
    }

    const user = users[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const codeHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 2. Mark any previous OTP as superseded
    await pool.query(
      `UPDATE OTP_Codes 
       SET Closed_At = NOW(), Closed_Reason = 'superseded' 
       WHERE User_ID = ? AND Purpose = 'password_reset' AND Closed_At IS NULL`,
      [user.User_ID]
    );

    // 3. Store new OTP in database
    await pool.query(
      `INSERT INTO OTP_Codes (User_ID, Code_Hash, Purpose, Expires_At) 
       VALUES (?, ?, 'password_reset', ?)`,
      [user.User_ID, codeHash, expiresAt]
    );

    // 4. Send email via Nodemailer
    await transporter.sendMail({
      from: `"Mr. Liempo POS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello <b>${user.Name}</b>,</p>
          <p>Use the following 6-digit verification code to reset your password:</p>
          <h1 style="color: #e60000; letter-spacing: 5px;">${otp}</h1>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    console.log(`[EMAIL SENT] OTP code sent to ${email}`);
    return res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to send OTP email', error: error.message });
  }
});
// POST /auth/verify-otp
app.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const [users] = await pool.query(
      'SELECT User_ID FROM Users WHERE Email = ? AND Status = "active" LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = users[0].User_ID;

    // Fetch active OTP for password reset
    const [codes] = await pool.query(
      `SELECT OTP_ID, Code_Hash, Attempts, Expires_At 
       FROM OTP_Codes 
       WHERE User_ID = ? AND Purpose = 'password_reset' AND Closed_At IS NULL 
       ORDER BY OTP_ID DESC LIMIT 1`,
      [userId]
    );

    if (codes.length === 0) {
      return res.status(400).json({ message: 'No active OTP request found' });
    }

    const activeOtp = codes[0];

    // Check expiration
    if (new Date() > new Date(activeOtp.Expires_At)) {
      await pool.query(
        "UPDATE OTP_Codes SET Closed_At = NOW(), Closed_Reason = 'locked' WHERE OTP_ID = ?",
        [activeOtp.OTP_ID]
      );
      return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
    }

    // Check attempts limit (schema enforces ck_otp_attempts <= 5)
    if (activeOtp.Attempts >= 5) {
      await pool.query(
        "UPDATE OTP_Codes SET Closed_At = NOW(), Closed_Reason = 'locked' WHERE OTP_ID = ?",
        [activeOtp.OTP_ID]
      );
      return res.status(400).json({ message: 'Too many failed attempts. Code locked.' });
    }

    const isMatch = await bcrypt.compare(otp, activeOtp.Code_Hash);
    if (!isMatch) {
      await pool.query(
        'UPDATE OTP_Codes SET Attempts = Attempts + 1 WHERE OTP_ID = ?',
        [activeOtp.OTP_ID]
      );
      return res.status(400).json({ message: 'Invalid 6-digit code. Please try again.' });
    }

    return res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Failed to verify code', error: error.message });
  }
});
// POST /auth/reset-password// POST /auth/reset-password
app.post('/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const [users] = await pool.query(
      'SELECT User_ID FROM Users WHERE Email = ? AND Status = "active" LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'Active user not found' });
    }

    const userId = users[0].User_ID;

    // Retrieve active OTP code
    const [codes] = await pool.query(
      `SELECT OTP_ID, Code_Hash, Expires_At 
       FROM OTP_Codes 
       WHERE User_ID = ? AND Purpose = 'password_reset' AND Closed_At IS NULL 
       ORDER BY OTP_ID DESC LIMIT 1`,
      [userId]
    );

    if (codes.length === 0 || new Date() > new Date(codes[0].Expires_At)) {
      return res.status(400).json({ message: 'Verification session expired. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(otp, codes[0].Code_Hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid verification session' });
    }

    // 1. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 2. Update user's password in pos_schema Users table
    await pool.query(
      'UPDATE Users SET Password_Hash = ? WHERE User_ID = ?',
      [passwordHash, userId]
    );

    // 3. Mark OTP as used
    await pool.query(
      "UPDATE OTP_Codes SET Closed_At = NOW(), Closed_Reason = 'used' WHERE OTP_ID = ?",
      [codes[0].OTP_ID]
    );

    return res.json({ message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

// 4. Protected Routes
app.get('/protected/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile accessed successfully',
    user: req.user,
  });
});

app.get('/protected/manager-dashboard', authenticateToken, authorizeRoles('Manager'), (req, res) => {
  res.json({
    message: 'Welcome to the Manager Dashboard',
    user: req.user,
  });
});

// 5. Start Server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on port ${PORT}`);
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL database.');
    connection.release();
  } catch (err) {
    console.error('Initial DB connection error:', err.message);
  }
});

// GET /protected/dashboard-report
// Requires your JWT verification middleware// GET /protected/dashboard-report
app.get('/protected/dashboard-report', authenticateToken, async (req, res) => {
  try {
    // 1. Top 4 sold items for today
    let [salesRows] = await pool.query(`
      SELECT 
        m.Item_Name AS label,
        CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS value
      FROM Order_Details od
      JOIN Menu_Items m ON od.Item_ID = m.Item_ID
      JOIN Orders o ON od.Order_ID = o.Order_ID
      WHERE DATE(o.Order_Date_Time) = CURDATE()
      GROUP BY m.Item_ID, m.Item_Name
      ORDER BY value DESC
      LIMIT 4
    `);

    // Fallback: If no orders were made today, fetch top items overall
    if (!salesRows || salesRows.length === 0) {
      const [allTimeSales] = await pool.query(`
        SELECT 
          m.Item_Name AS label,
          CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS value
        FROM Order_Details od
        JOIN Menu_Items m ON od.Item_ID = m.Item_ID
        GROUP BY m.Item_ID, m.Item_Name
        ORDER BY value DESC
        LIMIT 4
      `);
      salesRows = allTimeSales;
    }

    // 2. Total items sold today
    const [totalRows] = await pool.query(`
      SELECT 
        CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS total_items
      FROM Order_Details od
      JOIN Orders o ON od.Order_ID = o.Order_ID
      WHERE DATE(o.Order_Date_Time) = CURDATE()
    `);

    // 3. Recent 3 transactions
    const [transactionRows] = await pool.query(`
      SELECT 
        o.Order_ID AS id,
        DATE_FORMAT(o.Order_Date_Time, '%d/%m/%Y') AS date,
        DATE_FORMAT(o.Order_Date_Time, '%H:%i') AS time,
        'Cash' AS method,
        COALESCE(
          (SELECT m.Item_Name 
           FROM Order_Details od 
           JOIN Menu_Items m ON od.Item_ID = m.Item_ID 
           WHERE od.Order_ID = o.Order_ID 
           LIMIT 1), 
          'Order'
        ) AS product,
        CAST(o.Total_Amount AS CHAR) AS amount
      FROM Orders o
      ORDER BY o.Order_Date_Time DESC
      LIMIT 3
    `);

    return res.json({
      salesData: salesRows,
      totalSold: totalRows[0]?.total_items || 0,
      transactions: transactionRows,
    });
  } catch (error) {
    console.error('Error fetching dashboard report:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});