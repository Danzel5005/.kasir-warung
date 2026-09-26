const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const { getDataSyncService } = require('./services/DataSyncService');
const { getAuthService } = require('./services/AuthService');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

// Initialize app
const app = express();

// Initialize services
const syncService = getDataSyncService();
const authService = getAuthService();

// CORS configuration - adjust for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app'] // Add your frontend domain
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Kasir Warung Monitoring API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `${req.method} ${req.path} not found`
  });
});

// Start server
async function startServer() {
  try {
    // Initialize auth service
    await authService.initialize();
    
    // Start scheduled sync
    syncService.startScheduledSync();

    // Listen on port
    const port = config.port;
    app.listen(port, () => {
      console.log('='.repeat(60));
      console.log('🚀 Kasir Warung Monitoring Backend');
      console.log('='.repeat(60));
      console.log(`📡 Server running on http://localhost:${port}`);
      console.log(`⏰ Sync interval: ${config.syncIntervalMinutes} minutes`);
      console.log(`🗄️  Database: ${config.posDbPath}`);
      console.log('='.repeat(60));
      console.log('API Endpoints:');
      console.log('  POST   /api/auth/login         - Login');
      console.log('  GET    /api/data/health        - Health check');
      console.log('  GET    /api/data/status        - Sync status');
      console.log('  GET    /api/data/transactions  - Get transactions');
      console.log('  GET    /api/data/shifts        - Get shifts');
      console.log('  GET    /api/data/menu          - Get menu');
      console.log('  GET    /api/data/reports/laporan   - Full laporan');
      console.log('  GET    /api/data/reports/riwayat    - Full riwayat');
      console.log('='.repeat(60));
    });

  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Shutting down gracefully...');
  syncService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Shutting down gracefully...');
  syncService.close();
  process.exit(0);
});

// Start the server
startServer();
