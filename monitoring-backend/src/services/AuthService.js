const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

// In-memory user store (could be replaced with database)
class AuthService {
  constructor() {
    this.users = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Sample users - change these passwords in production!
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        name: 'Administrator'
      },
      {
        id: 2,
        username: 'manager',
        password: await bcrypt.hash('manager123', 10),
        role: 'manager',
        name: 'Manager'
      },
      {
        id: 3,
        username: 'viewer',
        password: await bcrypt.hash('viewer123', 10),
        role: 'viewer',
        name: 'Viewer'
      }
    ];

    this.users = defaultUsers;
    this.initialized = true;
    console.log('[AUTH] Authentication service initialized');
  }

  async validateUser(username, password) {
    const user = this.users.find(u => u.username === username);
    
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return null;
    }

    // Return user info without password
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };
  }

  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  getUserByToken(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) return null;

    return this.users.find(u => u.id === decoded.id);
  }

  hasPermission(userRole, requiredPermission) {
    const permissions = {
      'admin': ['*'],
      'manager': ['view', 'export'],
      'viewer': ['view']
    };

    const userPerms = permissions[userRole] || [];
    return userPerms.includes('*') || userPerms.includes(requiredPermission);
  }
}

// Singleton instance
let authServiceInstance = null;

function getAuthService() {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

module.exports = {
  AuthService,
  getAuthService
};
