const { SqliteAdapter } = require('../utils/sqlite');
const config = require('../config');

class DatabaseReader {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.adapter = new SqliteAdapter(dbPath);
  }

  async connect() {
    this.adapter.open();
  }

  async disconnect() {
    this.adapter.close();
  }

  async getTransactions(filters = {}) {
    const { startDate, endDate, shiftId, limit = 1000 } = filters;

    let query = 'SELECT id, data, created_at FROM transactions WHERE 1=1';
    const params = [];

    if (startDate) { query += ' AND date(created_at) >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND date(created_at) <= ?'; params.push(endDate); }
    if (shiftId) { query += " AND json_extract(data, '$.shiftId') = ?"; params.push(shiftId); }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.adapter.all(query, params);
    return rows.map((row) => ({ id: row.id, ...JSON.parse(row.data), createdAt: row.created_at }));
  }

  async getTransactionById(id) {
    const row = this.adapter.get(
      'SELECT id, data, created_at FROM transactions WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return { id: row.id, ...JSON.parse(row.data), createdAt: row.created_at };
  }

  async getShifts() {
    const rows = this.adapter.all(
      'SELECT id, data, created_at FROM shifts ORDER BY created_at DESC'
    );
    return rows.map((row) => ({ id: row.id, ...JSON.parse(row.data), createdAt: row.created_at }));
  }

  async getShiftById(id) {
    const row = this.adapter.get('SELECT id, data, created_at FROM shifts WHERE id = ?', [id]);
    if (!row) return null;
    return { id: row.id, ...JSON.parse(row.data), createdAt: row.created_at };
  }

  async getDailyStats(date) {
    return this.adapter.get(
      `SELECT
         COUNT(*) as totalTransactions,
         SUM(CAST(json_extract(data, '$.total') AS REAL)) as totalRevenue,
         SUM(CAST(json_extract(data, '$.paid') AS REAL)) as totalPaid,
         COUNT(CASE WHEN json_extract(data, '$.status') = 'voided' THEN 1 END) as voidCount
       FROM transactions
       WHERE date(created_at) = ?`,
      [date]
    );
  }

  async getSalesByPaymentMethod(startDate, endDate) {
    return this.adapter.all(
      `SELECT
         json_extract(data, '$.metodeBayar') as paymentMethod,
         COUNT(*) as count,
         SUM(CAST(json_extract(data, '$.paid') AS REAL)) as totalAmount
       FROM transactions
       WHERE date(created_at) >= ?
         AND date(created_at) <= ?
         AND json_extract(data, '$.status') != 'voided'
       GROUP BY paymentMethod
       ORDER BY totalAmount DESC`,
      [startDate, endDate]
    );
  }

  async getMenuItems() {
    const rows = this.adapter.all(
      'SELECT menu_id, kategori, stok, data FROM products ORDER BY created_at ASC'
    );
    return rows.map((row) => {
      const extra = row.data ? JSON.parse(row.data) : {};
      return {
        ...extra,
        id: row.menu_id ?? extra.id,
        kategori: row.kategori ?? extra.kategori,
        stok: row.stok === null || row.stok === undefined ? (extra.stok ?? null) : row.stok
      };
    });
  }

  async getTopSellingProducts(periodDays = 7) {
    const rows = this.adapter.all(
      `SELECT json_extract(data, '$.items') as items
       FROM transactions
       WHERE date(created_at) >= date('now', ?)
         AND json_extract(data, '$.status') != 'voided'`,
      [`-${periodDays} days`]
    );

    const itemCounts = {};
    rows.forEach((row) => {
      let items = row.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
      }
      (items || []).forEach((item) => {
        const itemId = item.id;
        if (itemId === undefined || itemId === null) return;
        if (!itemCounts[itemId]) {
          itemCounts[itemId] = { id: itemId, name: item.nama || item.name || 'Unknown', qty: 0, revenue: 0 };
        }
        itemCounts[itemId].qty += Number(item.qty) || 0;
        itemCounts[itemId].revenue += (Number(item.modal) || 0) * (Number(item.qty) || 0);
      });
    });

    return Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 20);
  }

  async getCashFlowData(shiftIds = []) {
    let query = `SELECT id, data, created_at FROM shifts WHERE 1=1`;
    const params = [];
    if (shiftIds.length > 0) {
      const placeholders = shiftIds.map(() => '?').join(', ');
      query += ` AND id IN (${placeholders})`;
      params.push(...shiftIds);
    }
    query += ' ORDER BY created_at ASC';

    const rows = this.adapter.all(query, params);
    return rows.map((row) => ({ id: row.id, ...JSON.parse(row.data), createdAt: row.created_at }));
  }

  async getRawTransactions(filters = {}) {
    const { startDate, endDate, limit = 500 } = filters;

    let query = 'SELECT id, data, created_at FROM transactions WHERE 1=1';
    const params = [];

    if (startDate) { query += ' AND date(created_at) >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND date(created_at) <= ?'; params.push(endDate); }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.adapter.all(query, params);
    return rows.map((row) => {
      const created = String(row.created_at || '');
      const [datePart, timePart] = created.split(' ');
      return {
        id: row.id,
        ...JSON.parse(row.data),
        createdAt: row.created_at,
        date: datePart || '',
        time: (timePart || '').substring(0, 5)
      };
    });
  }

  close() {
    this.adapter.close();
  }
}

module.exports = DatabaseReader;
