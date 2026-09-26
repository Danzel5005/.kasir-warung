const cron = require('node-cron');
const DatabaseReader = require('./DatabaseReader');
const config = require('../config');

class DataSyncService {
  constructor() {
    this.dbReader = new DatabaseReader(config.posDbPath);
    this.lastSyncTime = null;
    this.syncCount = 0;
    this.isRunning = false;
    this.listeners = [];
  }

  async connect() {
    await this.dbReader.connect();
  }

  async sync() {
    if (this.isRunning) {
      console.log('[SYNC] Sync already in progress, skipping...');
      return { status: 'skipped', reason: 'sync_in_progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[SYNC] Starting data synchronization...');
      
      // Connect to database
      await this.connect();

      // Fetch all required data
      const transactions = await this.dbReader.getRawTransactions({ limit: 2000 });
      const shifts = await this.dbReader.getShifts();
      const menuItems = await this.dbReader.getMenuItems();
      const dailyStats = await this.calculateDailyStats();
      
      const syncResult = {
        success: true,
        timestamp: new Date().toISOString(),
        counts: {
          transactions: transactions.length,
          shifts: shifts.length,
          menuItems: menuItems.length
        },
        data: {
          transactions,
          shifts,
          menuItems,
          statistics: dailyStats
        }
      };

      this.lastSyncTime = new Date();
      this.syncCount++;

      const duration = Date.now() - startTime;
      console.log(`[SYNC] Synchronization completed in ${duration}ms`);
      console.log(`[SYNC] Total transactions: ${transactions.length}, Shifts: ${shifts.length}`);

      // Notify listeners
      this.notifyListeners('sync_complete', syncResult);

      return syncResult;
    } catch (error) {
      console.error('[SYNC] Synchronization failed:', error.message);
      
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  async calculateDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    const stats = {};

    try {
      // Get today's stats
      const todayStats = await this.dbReader.getDailyStats(today);
      stats.today = todayStats || { totalTransactions: 0, totalRevenue: 0, totalPaid: 0, voidCount: 0 };

      // Get last 7 days of sales
      const salesByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayStats = await this.dbReader.getDailyStats(dateStr);
        if (dayStats) {
          salesByDay.push({
            date: dateStr,
            transactions: dayStats.totalTransactions || 0,
            revenue: dayStats.totalRevenue || 0,
            paid: dayStats.totalPaid || 0
          });
        }
      }

      stats.salesByDay = salesByDay;
    } catch (error) {
      console.error('[SYNC] Error calculating daily stats:', error.message);
      stats.error = error.message;
    }

    return stats;
  }

  registerListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[SYNC] Listener error:', error.message);
        }
      });
    }
  }

  startScheduledSync() {
    const intervalMinutes = config.syncIntervalMinutes;
    
    console.log(`[SYNC] Starting scheduled sync every ${intervalMinutes} minutes`);

    // Run immediately on start
    this.sync();

    // Schedule periodic sync
    cron.schedule(`*/${intervalMinutes} * * * *`, () => {
      console.log(`[SYNC] Scheduled sync triggered at ${new Date().toISOString()}`);
      this.sync();
    }, {
      scheduled: true,
      timezone: "Asia/Jakarta"
    });
  }

  getSyncStatus() {
    return {
      lastSync: this.lastSyncTime,
      syncCount: this.syncCount,
      isRunning: this.isRunning,
      intervalMinutes: config.syncIntervalMinutes,
      dbPath: config.posDbPath
    };
  }

  close() {
    this.dbReader.close();
  }
}

// Singleton instance
let dataSyncInstance = null;

function getDataSyncService() {
  if (!dataSyncInstance) {
    dataSyncInstance = new DataSyncService();
  }
  return dataSyncInstance;
}

module.exports = {
  DataSyncService,
  getDataSyncService
};
