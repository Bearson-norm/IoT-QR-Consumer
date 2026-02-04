const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDB } = require('../database');

// Login endpoint
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password harus diisi'
    });
  }

  const db = getDB();

  // Use PostgreSQL syntax (wrapper will convert ? to $1, $2, etc.)
  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, user) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      // Verify password
      const isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      // Create simple session token (in production, use JWT or proper session management)
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

      res.json({
        success: true,
        message: 'Login berhasil',
        token: token,
        username: username
      });
    }
  );
});

// Verify token (simple check)
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }

  // Simple token verification (in production, use proper JWT)
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username] = decoded.split(':');
    
    if (username) {
      res.json({
        success: true,
        username: username
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }
});

module.exports = router;


