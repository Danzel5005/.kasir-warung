require('dotenv').config();

module.exports = {
  // Database
  posDbPath: process.env.POS_DB_PATH || 'C:\\Users\\tech aarohi\\AppData\\Roaming\\kasir-warung\\data\\kasir.db',
  
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-me',
  jwtExpiresIn: '24h',
  
  // Sync settings
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES) || 5,
  
  // Data retention
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 90,
};
