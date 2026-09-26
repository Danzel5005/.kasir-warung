const express = require('express');
const router = express.Router();
const { getDataSyncService } = require('../services/DataSyncService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Initialize services
const syncService = getDataSyncService();

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  const status = syncService.getSyncStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...status
  });
});

// Get sync status (public info)
router.get('/status', (req, res) => {
  const status = syncService.getSyncStatus();
  res.json(status);
});

// Protected routes - all require authentication
router.use(authenticateToken);

// Get transactions with filters
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    
    const transactions = await syncService.dbReader.getRawTransactions({
      startDate,
      endDate,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('[API] Error fetching transactions:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      message: error.message 
    });
  }
});

// Get single transaction
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await syncService.dbReader.getTransactionById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('[API] Error fetching transaction:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch transaction',
      message: error.message 
    });
  }
});

// Get shifts
router.get('/shifts', async (req, res) => {
  try {
    const shifts = await syncService.dbReader.getShifts();
    
    res.json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    console.error('[API] Error fetching shifts:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch shifts',
      message: error.message 
    });
  }
});

// Get daily statistics
router.get('/stats/daily', async (req, res) => {
  try {
    const { date } = req.query;
    
    let stats;
    if (date) {
      stats = await syncService.dbReader.getDailyStats(date);
    } else {
      // Calculate current day stats
      stats = await syncService.calculateDailyStats();
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Error fetching stats:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      message: error.message 
    });
  }
});

// Get menu items
router.get('/menu', async (req, res) => {
  try {
    const menuItems = await syncService.dbReader.getMenuItems();
    
    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    console.error('[API] Error fetching menu:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch menu',
      message: error.message 
    });
  }
});

// Get full Laporan data (financial report)
router.get('/reports/laporan', async (req, res) => {
  try {
    const { shiftId } = req.query;
    
    // Get transactions
    const transactions = await syncService.dbReader.getRawTransactions({ 
      limit: 5000 
    });
    
    // Filter by shift if specified
    const filteredTransactions = shiftId 
      ? transactions.filter(t => t.shiftId === shiftId)
      : transactions;

    // Voided sales are excluded from financial totals (matches POS behaviour).
    const activeTransactions = filteredTransactions.filter(t => t.status !== 'voided');

    // Calculate financial metrics
    const totalRevenue = activeTransactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const totalPaid = activeTransactions.reduce((sum, t) => sum + (Number(t.bayar ?? t.paid ?? t.total) || 0), 0);
    const voidCount = filteredTransactions.filter(t => t.status === 'voided').length;
    
    // Get top selling products
    const topProducts = await syncService.dbReader.getTopSellingProducts(7);
    
    // Get cash flow data
    const shiftIds = filteredTransactions.map(t => t.shiftId).filter(Boolean);
    const cashFlow = await syncService.dbReader.getCashFlowData(shiftIds);
    
    res.json({
      success: true,
      summary: {
        totalTransactions: filteredTransactions.length,
        voidedTransactions: voidCount,
        totalRevenue: Math.round(totalRevenue),
        totalPaid: Math.round(totalPaid),
        averageOrderValue: activeTransactions.length > 0
          ? Math.round(totalRevenue / activeTransactions.length)
          : 0
      },
      data: {
        transactions: filteredTransactions,
        shifts: cashFlow,
        topProducts,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API] Error fetching laporan:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch laporan',
      message: error.message 
    });
  }
});

// Get full Riwayat data (transaction history)
router.get('/reports/riwayat', async (req, res) => {
  try {
    const { startDate, endDate, limit = 500 } = req.query;
    
    const transactions = await syncService.dbReader.getRawTransactions({
      startDate,
      endDate,
      limit: parseInt(limit)
    });
    
    // Get shifts for labeling
    const shifts = await syncService.dbReader.getShifts();
    const shiftMap = {};
    shifts.forEach(s => {
      shiftMap[s.id] = s;
    });
    
    // Enrich transactions with shift info
    const enrichedTransactions = transactions.map(t => ({
      ...t,
      shiftInfo: t.shiftId ? shiftMap[t.shiftId] : null
    }));
    
    res.json({
      success: true,
      count: enrichedTransactions.length,
      data: enrichedTransactions,
      shifts
    });
  } catch (error) {
    console.error('[API] Error fetching riwayat:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch riwayat',
      message: error.message 
    });
  }
});

// Trigger manual sync (admin only)
router.post('/sync', requireRole('admin'), async (req, res) => {
  try {
    const result = await syncService.sync();
    
    res.json({
      success: result.success,
      result
    });
  } catch (error) {
    console.error('[API] Sync error:', error.message);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message 
    });
  }
});

module.exports = router;
