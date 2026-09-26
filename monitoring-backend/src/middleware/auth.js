const { getAuthService } = require('../services/AuthService');
const config = require('../config');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied',
      message: 'No authorization token provided'
    });
  }

  const authService = getAuthService();
  const user = authService.getUserByToken(token);

  if (!user) {
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      message: 'Please login again'
    });
  }

  req.user = user;
  next();
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
