const fs = require("fs");

function createDatabaseService({ ipcMain, files, ensureDir, rJSON, atomicWrite, walAppend, walClear }) {
  let db = null;

  function initDB() {
    try {
      console.log("[Main] Loading better-sqlite3...");
      const Database = require("better-sqlite3");
      console.log("[Main] better-sqlite3 loaded");
      ensureDir();
      console.log("[Main] DATA_DIR:", files.dataDir);
      console.log("[Main] FILES.db:", files.db);
      console.log("[Main] Opening database...");
      db = new Database(files.db);
      console.log("[Main] Database opened");
      db.pragma("journal_mode = WAL");
      console.log("[Main] WAL mode set");
      db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE INDEX IF NOT EXISTS idx_trx_created ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_shifts_created ON shifts(created_at);
        CREATE INDEX IF NOT EXISTS idx_trx_created_date ON transactions(date(created_at));
      `);
      console.log("[Main] Tables created");
      console.log("[DB] SQLite initialized successfully");
      return true;
    } catch (err) {
      console.error("[DB] Failed to initialize SQLite:", err.message, err.stack);
      return false;
    }
  }

  function migrateJSONToSQLite() {
    if (!db) return;
    try {
      ensureDir();
      if (!fs.existsSync(files.jsonBackups)) fs.mkdirSync(files.jsonBackups, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      for (const [file, table, label] of [[files.trx, "transactions", "Transactions"], [files.shifts, "shifts", "Shifts"]]) {
        if (!fs.existsSync(file)) continue;
        const list = rJSON(file) || [];
        if (!list.length) continue;
        const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`);
        db.transaction((items) => items.forEach((item) => stmt.run(item.id || null, JSON.stringify(item))))(list);
        const backupPath = `${files.jsonBackups}/${label.toLowerCase()}_${timestamp}.json`;
        fs.copyFileSync(file, backupPath);
        console.log(`[Migration] ${label} migrated to SQLite. Backup: ${backupPath}`);
      }
    } catch (err) {
      console.error("[Migration] Error during JSON to SQLite migration:", err.message);
    }
  }

  function closeDB() {
    if (db) { db.close(); db = null; }
  }

  function registerHandlers() {
    ipcMain.handle("trx-load", () => {
      if (!db) return [];
      try { return db.prepare("SELECT id, data FROM transactions ORDER BY created_at DESC").all().map((row) => JSON.parse(row.data)); }
      catch (err) { console.error("[trx-load] Error:", err.message); return []; }
    });

    ipcMain.handle("trx-load-filtered", (_e, { fFrom, fTo, shiftId, page = 0, pageSize = 100, sort = "desc" }) => {
      if (!db) return { transactions: [], total: 0, page, pageSize };
      try {
        const conditions = []; const params = [];
        if (fFrom) { conditions.push("date(created_at) >= date(?)"); params.push(fFrom); }
        if (fTo) { conditions.push("date(created_at) <= date(?)"); params.push(fTo); }
        if (shiftId) { conditions.push("json_extract(data, '$.shiftId') = ?"); params.push(shiftId); }
        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const { total } = db.prepare(`SELECT COUNT(*) as total FROM transactions ${where}`).get(...params);
        const order = sort === "asc" ? "ASC" : "DESC";
        const rows = db.prepare(`SELECT id, data, created_at FROM transactions ${where} ORDER BY created_at ${order} LIMIT ? OFFSET ?`).all(...params, pageSize, page * pageSize);
        return { transactions: rows.map((row) => JSON.parse(row.data)), total, page, pageSize };
      } catch (err) { console.error("[trx-load-filtered] Error:", err.message); return { transactions: [], total: 0, page, pageSize }; }
    });

    const filter = (fFrom, fTo, shiftId) => {
      const conditions = []; const params = [];
      if (fFrom) { conditions.push("date(created_at) >= date(?)"); params.push(fFrom); }
      if (fTo) { conditions.push("date(created_at) <= date(?)"); params.push(fTo); }
      if (shiftId) { conditions.push("json_extract(data, '$.shiftId') = ?"); params.push(shiftId); }
      return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
    };
    ipcMain.handle("trx-get-daily-stats", (_e, { fFrom, fTo, shiftId }) => {
      if (!db) return [];
      try { const { where, params } = filter(fFrom, fTo, shiftId); return db.prepare(`SELECT date(created_at) as date, COUNT(*) as count, SUM(json_extract(data, '$.total')) as total, SUM(json_extract(data, '$.pax')) as pax, SUM(json_extract(data, '$.subtotal')) as subtotal FROM transactions ${where} GROUP BY date(created_at) ORDER BY date(created_at) DESC`).all(...params); }
      catch (err) { console.error("[trx-get-daily-stats] Error:", err.message); return []; }
    });
    ipcMain.handle("trx-get-shift-ids", () => {
      if (!db) return [];
      try { return db.prepare("SELECT DISTINCT json_extract(data, '$.shiftId') as shiftId FROM transactions WHERE json_extract(data, '$.shiftId') IS NOT NULL ORDER BY shiftId DESC").all().map((row) => row.shiftId).filter(Boolean); }
      catch (err) { console.error("[trx-get-shift-ids] Error:", err.message); return []; }
    });

    ipcMain.handle("trx-save", (_e, trx) => {
      if (!db) { const list = rJSON(files.trx) || []; list.unshift(trx); atomicWrite(files.trx, list); return { ok: true }; }
      try { db.prepare("INSERT INTO transactions (id, data) VALUES (?, ?)").run(trx.id || null, JSON.stringify(trx)); return { ok: true }; }
      catch (err) { console.error("[trx-save] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-delete", (_e, id) => {
      if (!db) { atomicWrite(files.trx, (rJSON(files.trx) || []).filter((item) => item.id !== id)); return { ok: true }; }
      try { db.prepare("DELETE FROM transactions WHERE id = ?").run(id); return { ok: true }; }
      catch (err) { console.error("[trx-delete] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-restore", (_e, list) => {
      if (!db) { atomicWrite(files.trx, list); return { ok: true }; }
      try { db.exec("DELETE FROM transactions"); const stmt = db.prepare("INSERT INTO transactions (id, data) VALUES (?, ?)"); db.transaction((items) => items.forEach((item) => stmt.run(item.id || null, JSON.stringify(item))))(list); return { ok: true }; }
      catch (err) { console.error("[trx-restore] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-clear", () => {
      if (!db) { atomicWrite(files.trx, []); return { ok: true }; }
      try { db.exec("DELETE FROM transactions"); return { ok: true }; }
      catch (err) { console.error("[trx-clear] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("process-payment", (_e, { trx, updatedMenu, activeBillId }) => {
      try {
        if (!db) {
          const allTrx = rJSON(files.trx) || []; allTrx.unshift(trx); atomicWrite(files.trx, allTrx);
          if (updatedMenu) atomicWrite(files.menu, updatedMenu);
          if (activeBillId) atomicWrite(files.bills, (rJSON(files.bills) || []).filter((bill) => String(bill.id) !== String(activeBillId)));
          return { ok: true };
        }
        walAppend(trx);
        db.prepare("INSERT INTO transactions (id, data) VALUES (?, ?)").run(trx.id || null, JSON.stringify(trx));
        if (updatedMenu) atomicWrite(files.menu, updatedMenu);
        if (activeBillId) atomicWrite(files.bills, (rJSON(files.bills) || []).filter((bill) => String(bill.id) !== String(activeBillId)));
        walClear();
        return { ok: true };
      } catch (err) { console.error("[process-payment] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("shifts-load", () => {
      if (!db) return [];
      try { return db.prepare("SELECT id, data FROM shifts ORDER BY created_at DESC").all().map((row) => JSON.parse(row.data)); }
      catch (err) { console.error("[shifts-load] Error:", err.message); return []; }
    });
    ipcMain.handle("shifts-save", (_e, list) => {
      if (!db) { atomicWrite(files.shifts, list); return { ok: true }; }
      try { db.exec("DELETE FROM shifts"); const stmt = db.prepare("INSERT INTO shifts (id, data) VALUES (?, ?)"); db.transaction((items) => items.forEach((item) => stmt.run(item.id || null, JSON.stringify(item))))(list); return { ok: true }; }
      catch (err) { console.error("[shifts-save] Error:", err.message); return { ok: false, error: err.message }; }
    });
  }

  return { initDB, migrateJSONToSQLite, closeDB, registerHandlers };
}

module.exports = { createDatabaseService };
