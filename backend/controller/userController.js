// backend/controller/userController.js
// Factory: pass in the MySQL pool from server.js so there is no circular import.

module.exports = (pool) => {
  // GET /users/me/role  (requires authenticateToken)
  // Looks the user up in the DB so a changed role or a suspended account
  // is reflected immediately, instead of trusting the role baked into the JWT.
  async function getMyRole(req, res) {
    try {
      const [rows] = await pool.query(
        'SELECT User_ID, Name, Username, Role, Status FROM Users WHERE User_ID = ? LIMIT 1',
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = rows[0];

      if (user.Status !== 'active') {
        return res.status(403).json({ message: 'Account is suspended' });
      }

      return res.json({
        id: user.User_ID,
        name: user.Name,
        username: user.Username,
        role: user.Role, // 'manager' | 'cashier'
      });
    } catch (error) {
      console.error('getMyRole error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return { getMyRole };
};