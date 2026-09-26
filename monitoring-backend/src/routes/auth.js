const express = require('express');
const router = express.Router();
const { getAuthService } = require('../services/AuthService');
const { authenticateToken } = require('../middleware/auth');

// Initialize auth service
const authService = getAuthService();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Username and password are required'
      });
    }

    const user = await authService.validateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    const token = authService.generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      expiresIn: authService.verifyToken(token).exp * 1000 - Date.now()
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
});

// Logout endpoint (client-side token deletion)
router.post('/logout', authenticateToken, (req, res) => {
  // Logout is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
