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

// 1. GET /protected/stocks — Fetch all stock items & low-stock status
app.get('/protected/stocks', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        Stock_ID AS id,
        Stock_Name AS name,
        Unit AS unit,
        CAST(ROUND(Current_Quantity) AS SIGNED) AS quantity,
        CAST(ROUND(Minimum_Level) AS SIGNED) AS minLevel
      FROM Stock_Items
      ORDER BY Stock_ID ASC
    `);
    const hasLowStock = rows.some((item) => item.quantity <= item.minLevel);
    return res.json({ stocks: rows, hasLowStock });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return res.status(500).json({ message: 'Failed to load stocks' });
  }
});

// 2. POST /protected/restock — Add stock via Purchase_Orders + sp_receive_po
app.post('/protected/restock', authenticateToken, async (req, res) => {
  const { stockId, itemName, quantity } = req.body;
  const userId = req.user.id || req.user.User_ID;
  const qty = Number(quantity);

  if (!qty || qty <= 0) {
    return res.status(400).json({ message: 'Please enter a valid positive quantity.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let targetId = stockId;
    if (!targetId && itemName) {
      const [found] = await conn.query(
        `SELECT Stock_ID FROM Stock_Items WHERE Stock_Name = ? LIMIT 1`,
        [itemName]
      );
      if (found.length === 0) {
        const [ins] = await conn.query(
          `INSERT INTO Stock_Items (Stock_Name, Unit, Current_Quantity, Minimum_Level) VALUES (?, 'pcs', 0, 10)`,
          [itemName]
        );
        targetId = ins.insertId;
      } else {
        targetId = found[0].Stock_ID;
      }
    }

    const [poResult] = await conn.query(`INSERT INTO Purchase_Orders (Order_Date) VALUES (NOW())`);
    const poId = poResult.insertId;

    await conn.query(
      `INSERT INTO Purchase_Order_Items (PO_ID, Stock_ID, Quantity) VALUES (?, ?, ?)`,
      [poId, targetId, qty]
    );

    await conn.commit();

    // Execute stored procedure sp_receive_po to atomically update stock and ledger
    await pool.query(`CALL sp_receive_po(?, ?)`, [poId, userId]);

    return res.json({ message: 'Item restocked successfully!' });
  } catch (error) {
    await conn.rollback();
    console.error('Error restocking item:', error);
    return res.status(500).json({ message: error.sqlMessage || 'Failed to restock item' });
  } finally {
    conn.release();
  }
});

// 3. POST /protected/waste — Record waste via sp_record_waste
app.post('/protected/waste', authenticateToken, async (req, res) => {
  const { stockId, itemName, quantity, reason = 'Recorded Waste', clientRequestId } = req.body;
  const userId = req.user.id || req.user.User_ID;
  const qty = Number(quantity);

  if (!qty || qty <= 0) {
    return res.status(400).json({ message: 'Please enter a valid positive quantity.' });
  }

  try {
    let targetId = stockId;
    if (!targetId && itemName) {
      const [found] = await pool.query(
        `SELECT Stock_ID FROM Stock_Items WHERE Stock_Name = ? LIMIT 1`,
        [itemName]
      );
      if (found.length === 0) {
        return res.status(404).json({ message: 'Stock item not found.' });
      }
      targetId = found[0].Stock_ID;
    }

    const reqUuid =
      clientRequestId ||
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

    await pool.query(`CALL sp_record_waste(?, ?, ?, ?, ?, @waste_id)`, [
      userId,
      reqUuid,
      targetId,
      qty,
      reason,
    ]);

    return res.json({ message: 'Waste recorded successfully!' });
  } catch (error) {
    console.error('Error recording waste:', error);
    return res.status(400).json({ message: error.sqlMessage || 'Failed to record waste' });
  }
});

// 4. GET /protected/waste-history — Fetch waste log entries
app.get('/protected/waste-history', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        w.Waste_ID AS id,
        DATE_FORMAT(w.Date, '%m/%d/%Y') AS date,
        s.Stock_Name AS item,
        CAST(ROUND(w.Quantity) AS CHAR) AS quantity
      FROM Waste_Log w
      JOIN Stock_Items s ON w.Stock_ID = s.Stock_ID
      ORDER BY w.Date DESC
    `);
    return res.json({ history: rows });
  } catch (error) {
    console.error('Error fetching waste history:', error);
    return res.status(500).json({ message: 'Failed to load waste history' });
  }
});

// 5. GET /protected/sales-report?period=Daily|Weekly|Monthly|Yearly
app.get('/protected/sales-report', authenticateToken, async (req, res) => {
  const period = req.query.period || 'Daily';
  try {
    let dateFilter = `DATE(o.Order_Date_Time) = CURDATE()`;
    if (period === 'Weekly') {
      dateFilter = `YEARWEEK(o.Order_Date_Time, 1) = YEARWEEK(CURDATE(), 1)`;
    } else if (period === 'Monthly') {
      dateFilter = `YEAR(o.Order_Date_Time) = YEAR(CURDATE()) AND MONTH(o.Order_Date_Time) = MONTH(CURDATE())`;
    } else if (period === 'Yearly') {
      dateFilter = `YEAR(o.Order_Date_Time) = YEAR(CURDATE())`;
    }

    let [salesRows] = await pool.query(`
      SELECT 
        m.Item_Name AS label,
        CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS value
      FROM Order_Details od
      JOIN Menu_Items m ON od.Item_ID = m.Item_ID
      JOIN Orders o ON od.Order_ID = o.Order_ID
      WHERE ${dateFilter}
      GROUP BY m.Item_ID, m.Item_Name
      ORDER BY value DESC
      LIMIT 4
    `);

    if (!salesRows || salesRows.length === 0) {
      const [allTime] = await pool.query(`
        SELECT 
          m.Item_Name AS label,
          CAST(COALESCE(SUM(od.Quantity), 0) AS UNSIGNED) AS value
        FROM Order_Details od
        JOIN Menu_Items m ON od.Item_ID = m.Item_ID
        GROUP BY m.Item_ID, m.Item_Name
        ORDER BY value DESC
        LIMIT 4
      `);
      salesRows = allTime;
    }

    return res.json({ salesData: salesRows });
  } catch (error) {
    console.error('Error fetching filtered sales report:', error);
    return res.status(500).json({ message: 'Failed to load sales report' });
  }
});

// ==========================================
// MANAGE PRICE ENDPOINTS
// ==========================================

// GET /protected/menu-items — Fetch all active menu items and prices// ==========================================
// MANAGE PRICE ENDPOINTS
// ==========================================

// GET /protected/menu-items — Fetch all active menu items and prices
app.get('/protected/menu-items', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        Item_ID AS id,
        Item_Name AS name,
        CAST(ROUND(Price) AS UNSIGNED) AS price,
        Category AS category
      FROM Menu_Items
      WHERE Is_Active = 1
      ORDER BY Item_ID ASC
    `);
    return res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ message: 'Failed to load menu items' });
  }
});

// PUT /protected/menu-items/:id — Update item price
app.put('/protected/menu-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { price, name } = req.body;
  const numericPrice = Number(price);

  if (!numericPrice || numericPrice <= 0) {
    return res.status(400).json({ message: 'Price must be greater than 0.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE Menu_Items SET Price = ? WHERE Item_ID = ? OR Item_Name = ?`,
      [numericPrice, id, name || '']
    );
    return res.json({ message: 'Price updated successfully', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('Error updating price:', error);
    return res.status(500).json({ message: 'Failed to update price' });
  }
});

// ==========================================
// ACCOUNT & STAFF MANAGEMENT ENDPOINTS
// ==========================================

// GET /protected/account — Get logged-in user's full account info
app.get('/protected/account', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.User_ID;
  try {
    const [rows] = await pool.query(
      `SELECT 
        User_ID AS id,
        Name AS name,
        Username AS username,
        Role AS role,
        Status AS status,
        COALESCE(Email, '') AS email,
        COALESCE(Phone, '') AS phone,
        DATE_FORMAT(Employment_Date, '%M %e, %Y') AS formattedDate,
        DATE_FORMAT(Employment_Date, '%m/%d/%Y') AS slashDate
      FROM Users
      WHERE User_ID = ? LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json({ account: rows[0] });
  } catch (error) {
    console.error('Error fetching account:', error);
    return res.status(500).json({ message: 'Failed to load account info' });
  }
});

// GET /protected/staff — List all staff members
app.get('/protected/staff', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        User_ID AS id,
        Name AS name,
        Username AS username,
        Role AS role,
        Status AS status,
        COALESCE(Email, '') AS email,
        COALESCE(Phone, '') AS phone,
        DATE_FORMAT(Employment_Date, '%m/%d/%Y') AS employmentDate
      FROM Users
      WHERE Role = 'cashier' OR User_ID > 1
      ORDER BY User_ID ASC
    `);
    return res.json({ staff: rows });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return res.status(500).json({ message: 'Failed to load staff list' });
  }
});

// POST /protected/staff — Create a new staff member
app.post('/protected/staff', authenticateToken, async (req, res) => {
  const { name, phone, email, password, employmentDate } = req.body;
  if (!name || !password) {
    return res.status(400).json({ message: 'Name and password are required.' });
  }

  try {
    const cleanUsername =
      name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) +
      Math.floor(10 + Math.random() * 90);
    const passwordHash = await bcrypt.hash(password, 10);

    // Parse mm/dd/yyyy to yyyy-mm-dd
    let sqlDate = new Date().toISOString().split('T')[0];
    if (employmentDate && employmentDate.includes('/')) {
      const parts = employmentDate.split('/');
      if (parts.length === 3) {
        sqlDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO Users (Name, Username, Password_Hash, Role, Status, Email, Phone, Employment_Date)
       VALUES (?, ?, ?, 'cashier', 'active', ?, ?, ?)`,
      [name.trim(), cleanUsername, passwordHash, email?.trim() || null, phone?.trim() || null, sqlDate]
    );

    return res.json({ message: 'Staff created successfully', id: result.insertId });
  } catch (error) {
    console.error('Error creating staff:', error);
    return res.status(400).json({ message: error.sqlMessage || 'Failed to create staff' });
  }
});

// PUT /protected/staff/:id — Edit staff or own profile
app.put('/protected/staff/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, employmentDate } = req.body;

  try {
    let sqlDate = null;
    if (employmentDate && employmentDate.includes('/')) {
      const parts = employmentDate.split('/');
      if (parts.length === 3) {
        sqlDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }

    await pool.query(
      `UPDATE Users 
       SET Name = COALESCE(?, Name),
           Phone = COALESCE(?, Phone),
           Email = COALESCE(?, Email),
           Employment_Date = COALESCE(?, Employment_Date)
       WHERE User_ID = ?`,
      [name?.trim() || null, phone?.trim() || null, email?.trim() || null, sqlDate, id]
    );

    return res.json({ message: 'Updated successfully' });
  } catch (error) {
    console.error('Error updating staff:', error);
    return res.status(400).json({ message: error.sqlMessage || 'Failed to update details' });
  }
});

// PATCH /protected/staff/:id/suspend — Suspend or reactivate staff
app.patch('/protected/staff/:id/suspend', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status = 'suspended' } = req.body;
  try {
    await pool.query(`UPDATE Users SET Status = ? WHERE User_ID = ?`, [status, id]);
    return res.json({ message: `Staff status updated to ${status}` });
  } catch (error) {
    console.error('Error suspending staff:', error);
    return res.status(500).json({ message: 'Failed to suspend staff' });
  }
});

// DELETE /protected/staff/:id — Remove staff if no orders exist, otherwise suspend
app.delete('/protected/staff/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM Users WHERE User_ID = ?`, [id]);
    return res.json({ message: 'Staff deleted' });
  } catch (error) {
    // Foreign key guard fallback: suspend if user has historical orders
    await pool.query(`UPDATE Users SET Status = 'suspended' WHERE User_ID = ?`, [id]);
    return res.json({ message: 'Staff has historical records and was marked suspended instead.' });
  }
});

// PATCH /protected/staff/:id/suspend — Suspend or Unsuspend staff
app.patch('/protected/staff/:id/suspend', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'suspended' or 'active'

  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    await pool.query(`UPDATE Users SET Status = ? WHERE User_ID = ?`, [status, id]);
    return res.json({ message: `Staff status updated to ${status}`, status });
  } catch (error) {
    console.error('Error updating staff status:', error);
    return res.status(500).json({ message: 'Failed to update staff status' });
  }
});

// DELETE /protected/staff/:id — Delete staff account
app.delete('/protected/staff/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM Users WHERE User_ID = ?`, [id]);
    return res.json({ message: 'Staff account deleted successfully' });
  } catch (error) {
    // Fallback if foreign key constraints (Orders/Stock_Movements) exist
    console.error('Delete constraint triggered:', error);
    return res.status(400).json({
      message: 'Cannot permanently delete staff with existing transaction records. Suspend them instead.',
    });
  }
});

// ==========================================
// POS ORDER, TRANSACTION HISTORY & PASSWORD
// ==========================================

// 1. POST /protected/orders — Create POS Order & Payment using sp_create_order
app.post('/protected/orders', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.User_ID;
  const { items, amountReceived, clientRequestId } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart cannot be empty.' });
  }

  const reqUuid =
    clientRequestId ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

  try {
    // Call sp_create_order stored procedure
    await pool.query(
      `CALL sp_create_order(?, ?, ?, ?, @o_order_id, @o_change)`,
      [userId, reqUuid, JSON.stringify(items), Number(amountReceived)]
    );

    const [[outVars]] = await pool.query(
      `SELECT @o_order_id AS orderId, @o_change AS changeAmount`
    );

    return res.json({
      message: 'Transaction success!',
      orderId: outVars?.orderId,
      changeAmount: Number(outVars?.changeAmount || 0),
    });
  } catch (error) {
    console.error('POS Order Error:', error);
    return res.status(400).json({
      message: error.sqlMessage || 'Failed to complete transaction.',
    });
  }
});

// 2. GET /protected/transactions — Full Transaction History list
app.get('/protected/transactions', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        o.Order_ID AS id,
        DATE_FORMAT(o.Order_Date_Time, '%m/%e/%Y') AS date,
        DATE_FORMAT(o.Order_Date_Time, '%H:%i') AS time,
        'Cash' AS method,
        COALESCE(
          (SELECT GROUP_CONCAT(m.Item_Name SEPARATOR ', ')
           FROM Order_Details od
           JOIN Menu_Items m ON od.Item_ID = m.Item_ID
           WHERE od.Order_ID = o.Order_ID),
          'Whole Cut Chicken'
        ) AS product,
        CAST(ROUND(o.Total_Amount) AS CHAR) AS amount
      FROM Orders o
      ORDER BY o.Order_Date_Time DESC
      LIMIT 50
    `);
    return res.json({ transactions: rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ message: 'Failed to load transaction history' });
  }
});

// 3. PUT /protected/change-password — Authenticated Edit Password
app.put('/protected/change-password', authenticateToken, async (req, res) => {
  const userId = req.user.id || req.user.User_ID;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE Users SET Password_Hash = ? WHERE User_ID = ?`, [
      hashed,
      userId,
    ]);
    return res.json({ message: 'Password updated successfully!' });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'Failed to update password.' });
  }
});