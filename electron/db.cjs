const fs = require("fs");
const path = require("path");

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
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          menu_id TEXT UNIQUE COLLATE NOCASE,
          kategori TEXT,
          stok REAL,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_trx_created ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_shifts_created ON shifts(created_at);
        CREATE INDEX IF NOT EXISTS idx_trx_created_date ON transactions(date(created_at));
        CREATE INDEX IF NOT EXISTS idx_products_menu_id ON products(menu_id);
        CREATE INDEX IF NOT EXISTS idx_products_kategori ON products(kategori);
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
      migrateMenuToProducts();
    } catch (err) {
      console.error("[Migration] Error during JSON to SQLite migration:", err.message);
    }
  }

  // ── Menu: pindah dari menu.json ke tabel `products`.
  // `data` menyimpan seluruh field JSON item, `menu_id`/`kategori`/`stok`
  // diangkat jadi kolom supaya bisa di-query & di-update tanpa parsing JSON.
  // menu.json TIDAK dihapus supaya bisa rollback & dipakai backup lama.
  function rowToMenu(row) {
    if (!row) return null;
    const extra = row.data ? JSON.parse(row.data) : {};
    return { ...extra, id: row.menu_id ?? extra.id, kategori: row.kategori ?? extra.kategori, stok: row.stok === null || row.stok === undefined ? (extra.stok ?? null) : row.stok };
  }

  // Simpan satu item. PENTING: baris yang sudah ada TIDAK menimpa `stok`
  // (stok hanya berubah lewat applyStockDelta / menu-replace), supaya upsert
  // dari form edit tidak menghapus penjualan yang berjalan bersamaan.
  function upsertMenuRow(item, { overwriteStock = false } = {}) {
    if (!item || item.id === undefined || item.id === null) return false;
    const menuId = String(item.id);
    const kategori = item.kategori ?? null;
    // `stok` non-finite diperlakukan sebagai tak terbatas (null).
    const stok = (item.stok === null || item.stok === undefined || item.stok === "" || !Number.isFinite(Number(item.stok))) ? null : Number(item.stok);
    const data = JSON.stringify(item);
    const existing = db.prepare("SELECT menu_id, data FROM products WHERE menu_id = ?").get(menuId);
    if (!existing) {
      db.prepare("INSERT INTO products (id, menu_id, kategori, stok, data) VALUES (?, ?, ?, ?, ?)").run(menuId, menuId, kategori, stok, data);
      return true;
    }
    if (overwriteStock) {
      db.prepare("UPDATE products SET kategori = ?, stok = ?, data = ? WHERE menu_id = ?").run(kategori, stok, data, menuId);
    } else {
      db.prepare("UPDATE products SET kategori = ?, data = ? WHERE menu_id = ?").run(kategori, data, menuId);
    }
    return true;
  }

  function loadMenuList() {
    if (!db) return rJSON(files.menu) || [];
    try { return db.prepare("SELECT menu_id, kategori, stok, data FROM products ORDER BY created_at ASC").all().map(rowToMenu).filter(Boolean); }
    catch (err) { console.error("[menu-load] Error:", err.message); return []; }
  }

  // Ganti SELURUH tabel products (dipakai clear, undo, restore backup).
  function replaceMenuList(list) {
    const items = Array.isArray(list) ? list : [];
    db.exec("DELETE FROM products");
    const stmt = db.prepare("INSERT INTO products (id, menu_id, kategori, stok, data) VALUES (?, ?, ?, ?, ?)");
    db.transaction((entries) => {
      entries.forEach((item) => {
        if (!item || item.id === undefined || item.id === null) return;
        const menuId = String(item.id);
        const stok = (item.stok === null || item.stok === undefined || item.stok === "" || !Number.isFinite(Number(item.stok))) ? null : Number(item.stok);
        stmt.run(menuId, menuId, item.kategori ?? null, stok, JSON.stringify(item));
      });
    })(items);
  }

  function migrateMenuToProducts() {
    if (!db) return { migrated: 0 };
    try {
      const existing = db.prepare("SELECT COUNT(*) as total FROM products").get();
      if (existing && existing.total > 0) return { migrated: 0, skipped: true };
      if (!fs.existsSync(files.menu)) return { migrated: 0 };
      const list = rJSON(files.menu) || [];
      if (!list.length) return { migrated: 0 };
      replaceMenuList(list);
      if (!fs.existsSync(files.jsonBackups)) fs.mkdirSync(files.jsonBackups, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(files.menu, `${files.jsonBackups}/menu_${stamp}.json`);
      console.log(`[Migration] Menu migrated to SQLite products table (${list.length} items).`);
      return { migrated: list.length };
    } catch (err) {
      console.error("[Migration] Error migrating menu to products:", err.message);
      return { migrated: 0, error: err.message };
    }
  }

  function closeDB() {
    if (db) { db.close(); db = null; }
  }

  // Satu pintu untuk stok (Langkah 2). Menerima delta (bukan overwrite),
  // di-clamp ke 0. Mengembalikan peta `{id: stok}` untuk id yang berubah.
  // Diletakkan di scope createDatabaseService supaya bisa dipakai oleh
  // handler (process-payment, trx-void, apply-stock) DAN diekspor.
  function applyStockDelta(deltas, meta = {}) {
    const map = deltas && typeof deltas === "object" ? deltas : {};
    const stock = {};
    if (!db) return stock;
    const ids = Object.keys(map);
    if (!ids.length) return stock;
    const getRow = db.prepare("SELECT menu_id, stok, data FROM products WHERE menu_id = ?");
    const setRow = db.prepare("UPDATE products SET stok = ? WHERE menu_id = ?");
    const run = db.transaction(() => {
      for (const id of ids) {
        const row = getRow.get(String(id));
        if (!row) continue; // item tak ada / sudah dihapus
        if (row.stok === null || row.stok === undefined) continue; // stok tak terbatas
        const delta = Number(map[id]) || 0;
        if (delta === 0) continue;
        const next = Math.max(0, Number(row.stok) + delta);
        setRow.run(next, String(id));
        stock[id] = next;
      }
    });
    run();
    return stock;
  }

  // ── Stok: helper bersama.
  // Mengembalikan stok untuk item pada transaksi yang di-void. Dipakai oleh
  // kedua cabang trx-void. `menu` opsional: kalau pemanggil sudah memegang
  // array menu (mis. cabang JSON yang baru membacanya), kirim supaya tidak
  // membaca file dua kali. Item dengan `stok === null` (tak terbatas) dan item
  // yang sudah dihapus dari menu DILEWATI. Baris satuan memakai baseQty.
  function restoreStockFromTrx(trx, menu) {
    const list = Array.isArray(menu) ? menu : (rJSON(files.menu) || []);
    const items = Array.isArray(trx?.items) ? trx.items : [];
    if (!items.length || !list.length) return { menu: list, restored: 0 };
    let restored = 0;
    const next = list.map((m) => ({ ...m }));
    const nextById = new Map(next.map((m) => [String(m.id), m]));
    for (const it of items) {
      const target = nextById.get(String(it?.id));
      if (!target) continue; // item sudah dihapus dari menu
      if (target.stok === null || target.stok === undefined) continue; // stok tak terbatas
      const qty = Number(it?.baseQty ?? it?.qty) || 0;
      if (qty === 0) continue;
      target.stok = Number(target.stok) + qty;
      restored += qty;
    }
    return { menu: next, restored };
  }

  function registerHandlers() {
    // ── Menu IPC (Langkah 2). Menu kini di tabel `products`; menu.json tetap
    // ditulis sebagai cermin supaya backup lama & fallback browser tetap jalan.
    ipcMain.handle("menu-load", () => {
      if (!db) return rJSON(files.menu) || [];
      return loadMenuList();
    });
    ipcMain.handle("menu-upsert", (_e, item) => {
      if (!db) {
        const list = rJSON(files.menu) || [];
        const idx = list.findIndex((m) => String(m.id) === String(item?.id));
        if (idx >= 0) list[idx] = { ...item, stok: list[idx].stok }; else list.push(item);
        atomicWrite(files.menu, list);
        return { ok: true };
      }
      try { upsertMenuRow(item); return { ok: true, menu: loadMenuList() }; }
      catch (err) { console.error("[menu-upsert] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("menu-delete", (_e, id) => {
      if (!db) { atomicWrite(files.menu, (rJSON(files.menu) || []).filter((m) => String(m.id) !== String(id))); return { ok: true }; }
      try { db.prepare("DELETE FROM products WHERE menu_id = ?").run(String(id)); return { ok: true, menu: loadMenuList() }; }
      catch (err) { console.error("[menu-delete] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("menu-replace", (_e, list) => {
      if (!db) { atomicWrite(files.menu, list || []); return { ok: true }; }
      try { replaceMenuList(list); return { ok: true, menu: loadMenuList() }; }
      catch (err) { console.error("[menu-replace] Error:", err.message); return { ok: false, error: err.message }; }
    });
    // Renderer memakai ini untuk hold/cancel open bill (temuan 1: stok bill
    // dulu hanya di state React, hilang saat restart).
    ipcMain.handle("apply-stock", (_e, deltas, meta) => {
      try { const stock = applyStockDelta(deltas, meta || {}); return { ok: true, stock }; }
      catch (err) { console.error("[apply-stock] Error:", err.message); return { ok: false, error: err.message }; }
    });

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
      if (!db) {
        const all = rJSON(files.trx) || [];
        const trx = all.find((item) => String(item.id) === String(id)) || null;
        atomicWrite(files.trx, all.filter((item) => String(item.id) !== String(id)));
        return { ok: true, trx };
      }
      try {
        const row = db.prepare("SELECT data FROM transactions WHERE id = ?").get(id);
        const trx = row ? JSON.parse(row.data) : null;
        db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
        return { ok: true, trx };
      } catch (err) { console.error("[trx-delete] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-void", (_e, id, { reason, actor, note } = {}) => {
      const patch = { status: "voided", voidedAt: new Date().toISOString(), voidedBy: actor || null, voidReason: reason || null, voidNote: note || "" };
      if (!db) {
        const all = rJSON(files.trx) || [];
        const found = all.find((t) => String(t.id) === String(id));
        if (!found) return { ok: false, error: "Transaksi tidak ditemukan" };
        // Cegah restore stok ganda: void dua kali hanya menandai sekali.
        if (found.status === "voided" || found.voided === true) {
          return { ok: false, error: "Transaksi sudah void" };
        }
        const { menu } = restoreStockFromTrx(found);
        if (menu && menu.length) atomicWrite(files.menu, menu);
        const updated = all.map(t => String(t.id) === String(id) ? { ...t, ...patch } : t);
        atomicWrite(files.trx, updated);
        return { ok: true, menu };
      }
      try {
        const row = db.prepare("SELECT data FROM transactions WHERE id = ?").get(id);
        if (!row) return { ok: false, error: "Transaksi tidak ditemukan" };
        const current = JSON.parse(row.data);
        if (current.status === "voided" || current.voided === true) {
          return { ok: false, error: "Transaksi sudah void" };
        }
        const merged = { ...current, ...patch };
        let menu = null;
        const run = db.transaction(() => {
          db.prepare("UPDATE transactions SET data = ? WHERE id = ?").run(JSON.stringify(merged), id);
          // Void mengembalikan stok (Langkah 1) — lewat satu pintu applyStockDelta.
          applyStockDelta(stockDeltasFromTrx(current, 1), { type: "void", ref: id });
        });
        run();
        menu = loadMenuList();
        atomicWrite(files.menu, menu); // cermin untuk backup lama & fallback
        return { ok: true, menu };
      } catch (err) {
        console.error("[trx-void] Error:", err.message);
        return { ok: false, error: err.message };
      }
    });
    ipcMain.handle("trx-restore", (_e, list) => {
      if (!db) { atomicWrite(files.trx, list); return { ok: true }; }
      try { db.exec("DELETE FROM transactions"); const stmt = db.prepare("INSERT INTO transactions (id, data) VALUES (?, ?)"); db.transaction((items) => items.forEach((item) => stmt.run(item.id || null, JSON.stringify(item))))(list); return { ok: true }; }
      catch (err) { console.error("[trx-restore] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-clear", () => {
      // Snapshot SELURUH transaksi ke file dulu, supaya undo "Hapus Semua" tidak
      // bergantung pada satu halaman riwayat di renderer. File juga jadi jaring
      // pengaman setelah jendela undo 9 detik lewat.
      let backupFile = null;
      try {
        ensureDir();
        const all = db
          ? db.prepare("SELECT id, data FROM transactions ORDER BY created_at DESC").all().map((row) => JSON.parse(row.data))
          : (rJSON(files.trx) || []);
        if (all.length) {
          if (!fs.existsSync(files.jsonBackups)) fs.mkdirSync(files.jsonBackups, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          backupFile = `${files.jsonBackups}/trx-cleared-${stamp}.json`;
          atomicWrite(backupFile, all);
        }
      } catch (err) { console.error("[trx-clear] Snapshot error:", err.message); }
      if (!db) { atomicWrite(files.trx, []); return { ok: true, backupFile }; }
      try { db.exec("DELETE FROM transactions"); return { ok: true, backupFile }; }
      catch (err) { console.error("[trx-clear] Error:", err.message); return { ok: false, error: err.message }; }
    });
    ipcMain.handle("trx-restore-cleared", (_e, backupFile) => {
      // Hanya boleh membaca file di dalam jsonBackups (cegah path traversal).
      try {
        if (!backupFile) return { ok: false, error: "File backup tidak diberikan" };
        const base = path.resolve(files.jsonBackups);
        const target = path.resolve(String(backupFile));
        if (target !== base && !target.startsWith(base + path.sep)) return { ok: false, error: "File di luar folder backup" };
        if (!fs.existsSync(target)) return { ok: false, error: "File backup tidak ditemukan" };
        const list = rJSON(target);
        if (!Array.isArray(list)) return { ok: false, error: "Isi backup tidak valid" };
        if (!db) {
          const all = rJSON(files.trx) || [];
          const seen = new Set(all.map((t) => String(t.id)));
          const merged = [...all, ...list.filter((t) => t && !seen.has(String(t.id)))];
          atomicWrite(files.trx, merged);
          return { ok: true, restored: merged.length - all.length };
        }
        const stmt = db.prepare("INSERT OR IGNORE INTO transactions (id, data) VALUES (?, ?)");
        const info = db.transaction((items) => {
          let n = 0;
          items.forEach((item) => { if (item) n += stmt.run(item.id || null, JSON.stringify(item)).changes; });
          return n;
        })(list);
        return { ok: true, restored: info };
      } catch (err) {
        console.error("[trx-restore-cleared] Error:", err.message);
        return { ok: false, error: err.message };
      }
    });
    // Deltas stok dari item transaksi. Baris satuan memakai baseQty.
    // Item `additionals` tidak memotong stok (bukan SKU).
    function stockDeltasFromTrx(trx, sign) {
      const deltas = {};
      const items = Array.isArray(trx?.items) ? trx.items : [];
      for (const it of items) {
        if (!it || it.id === undefined || it.id === null) continue;
        const qty = Number(it.baseQty ?? it.qty) || 0;
        if (qty === 0) continue;
        deltas[String(it.id)] = (deltas[String(it.id)] || 0) + sign * qty;
      }
      return deltas;
    }

    ipcMain.handle("process-payment", (_e, { trx, updatedMenu, activeBillId }) => {
      try {
        if (!db) {
          const allTrx = rJSON(files.trx) || []; allTrx.unshift(trx); atomicWrite(files.trx, allTrx);
          if (updatedMenu) atomicWrite(files.menu, updatedMenu);
          if (activeBillId) atomicWrite(files.bills, (rJSON(files.bills) || []).filter((bill) => String(bill.id) !== String(activeBillId)));
          return { ok: true, stock: {} };
        }
        walAppend(trx);
        // INSERT transaksi + potong stok dalam SATU transaksi SQLite. Kalau
        // bayar dari open bill, stok sudah dipotong saat bill dibuat -> skip.
        let stock = {};
        const run = db.transaction(() => {
          db.prepare("INSERT INTO transactions (id, data) VALUES (?, ?)").run(trx.id || null, JSON.stringify(trx));
          if (!activeBillId) stock = applyStockDelta(stockDeltasFromTrx(trx, -1), { type: "sale", ref: trx?.id });
        });
        run();
        if (activeBillId) atomicWrite(files.bills, (rJSON(files.bills) || []).filter((bill) => String(bill.id) !== String(activeBillId)));
        walClear();
        return { ok: true, stock };
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

  return { initDB, migrateJSONToSQLite, migrateMenuToProducts, closeDB, registerHandlers, applyStockDelta, loadMenuList, replaceMenuList, restoreStockFromTrx };
}

module.exports = { createDatabaseService };
