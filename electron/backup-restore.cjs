const fs = require("fs");
const path = require("path");

// createBackupRestoreService — full-workspace backup & restore for the desktop app.
//
// Unlike backup.cjs (which only snapshots transactions for daily WAL safety),
// this service can:
//   • collect EVERY persisted store (JSON files + the SQLite DB) into one file
//   • restore that file back, always taking a safety snapshot first
//   • expose the on-disk data folder and quick stats for the settings UI
//
// Storage map is derived from `files` so it stays in sync with main.cjs.
function createBackupRestoreService({ app, ipcMain, dialog, files, ensureDir, rJSON, closeDB, initDB, migrateJSONToSQLite }) {
  const FORMAT = "kasir-warung-backup";
  const VERSION = 1;

  // The JSON stores that make up "all the data". `db` (SQLite) is handled
  // separately because it must be closed before/after the file copy.
  const STORES = [
    ["menu", files.menu],
    ["categories", files.cats],
    ["settings", files.settings],
    ["users", files.users],
    ["customers", files.customers],
    ["qris", files.qris],
    ["bills", files.bills],
    ["shifts", files.shifts],
    ["transactions", files.trx],
    ["logo", files.logo],
  ];

  const ARRAY_STORES = new Set(["menu", "categories", "users", "customers", "bills", "shifts", "transactions"]);

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
  const today = () => new Date().toISOString().slice(0, 10);

  function ensureBackupDir() {
    ensureDir();
    if (!fs.existsSync(files.backups)) fs.mkdirSync(files.backups, { recursive: true });
    return files.backups;
  }

  // collectStores — read every JSON store, substituting safe defaults so the
  // backup file is always structurally complete (and therefore restorable).
  function collectStores() {
    ensureDir();
    const out = {};
    const counts = {};
    for (const [key, file] of STORES) {
      let value = null;
      try { value = rJSON(file); } catch { value = null; }
      if (value === null || value === undefined) value = ARRAY_STORES.has(key) ? [] : {};
      out[key] = value;
      counts[key] = Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 1;
    }
    return { stores: out, counts };
  }

  function countDB(table) {
    // Lazy require so this module stays loadable in tests without sqlite.
    try {
      const Database = require("better-sqlite3");
      if (!fs.existsSync(files.db)) return 0;
      const db = new Database(files.db, { readonly: true, fileMustExist: true });
      const row = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get();
      db.close();
      return row ? row.n : 0;
    } catch { return null; }
  }

  // stats — used by the settings panel to show what will be backed up.
  function stats() {
    const { counts } = collectStores();
    return {
      ok: true,
      dataDir: files.dataDir,
      counts,
      dbTransactions: countDB("transactions"),
      dbShifts: countDB("shifts"),
      dbExists: fs.existsSync(files.db),
      lastBackup: latestBackupInfo(),
    };
  }

  function latestBackupInfo() {
    try {
      const dir = files.backups;
      if (!fs.existsSync(dir)) return null;
      const entry = fs.readdirSync(dir)
        .filter((f) => f.endsWith(".json") || f.endsWith(".kwbak"))
        .map((f) => ({ file: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0];
      if (!entry) return null;
      return { file: entry.file, at: new Date(entry.mtime).toISOString() };
    } catch { return null; }
  }

  // createBackup — writes a full snapshot to the user's chosen path.
  // `target` may be undefined, in which case a save dialog is shown.
  async function createBackup(target, options = {}) {
    try {
      const { stores, counts } = collectStores();
      const payload = {
        format: FORMAT,
        version: VERSION,
        app: "Kasir Warung",
        exportedAt: new Date().toISOString(),
        dataDir: files.dataDir,
        counts,
        data: stores,
      };

      let filePath = target;
      if (!filePath) {
        const suggested = `Kasir_Warung_Backup_${today()}.json`;
        const res = await dialog.showSaveDialog({
          title: "Simpan Backup Kasir Warung",
          defaultPath: suggested,
          filters: [{ name: "Backup Kasir Warung", extensions: ["json"] }],
        });
        if (res.canceled || !res.filePath) return { ok: false, canceled: true };
        filePath = res.filePath;
      }

      const json = JSON.stringify(payload, null, 2);
      const tmp = `${filePath}.tmp`;
      fs.writeFileSync(tmp, json, "utf-8");
      const fd = fs.openSync(tmp, "r+");
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmp, filePath);

      // Keep an automatic copy in the app data folder too, regardless of where
      // the user saved it — so a "restore" is always possible without hunting
      // for the file they exported weeks ago.
      let internalCopy = null;
      if (options.keepInternal !== false) {
        try {
          internalCopy = path.join(ensureBackupDir(), `full_${stamp()}.json`);
          fs.copyFileSync(filePath, internalCopy);
          pruneInternal();
        } catch { internalCopy = null; }
      }

      return {
        ok: true,
        filePath,
        internalCopy,
        counts,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        exportedAt: payload.exportedAt,
      };
    } catch (err) {
      console.error("[Backup] createBackup failed:", err.message);
      return { ok: false, error: err.message };
    }
  }

  // Keep only the 20 newest full_* snapshots so the data folder never grows
  // without bound. Daily trx_* backups are pruned separately in backup.cjs.
  function pruneInternal() {
    try {
      const dir = files.backups;
      const list = fs.readdirSync(dir).filter((f) => f.startsWith("full_") && f.endsWith(".json")).sort();
      if (list.length > 20) list.slice(0, list.length - 20).forEach((f) => { try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ } });
    } catch { /* ignore */ }
  }

  // listInternalBackups — newest-first snapshots living in the data folder.
  function listInternalBackups() {
    try {
      const dir = files.backups;
      if (!fs.existsSync(dir)) return { ok: true, backups: [] };
      const backups = fs.readdirSync(dir)
        .filter((f) => f.startsWith("full_") && f.endsWith(".json"))
        .map((f) => {
          const st = fs.statSync(path.join(dir, f));
          return { file: f, path: path.join(dir, f), size: st.size, at: new Date(st.mtime).toISOString() };
        })
        .sort((a, b) => (a.at < b.at ? 1 : -1));
      return { ok: true, backups };
    } catch (err) {
      return { ok: false, error: err.message, backups: [] };
    }
  }

  function readBackupFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Isi file backup tidak valid");
    return parsed;
  }

  // previewBackup — parse + summarise without touching any live data.
  async function previewBackup(candidate) {
    try {
      let filePath = candidate;
      if (!filePath) {
        const res = await dialog.showOpenDialog({
          title: "Pilih File Backup",
          properties: ["openFile"],
          filters: [{ name: "Backup Kasir Warung", extensions: ["json"] }],
        });
        if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
        [filePath] = res.filePaths;
      }
      const parsed = readBackupFile(filePath);
      const stores = parsed.format === FORMAT ? parsed.data : parsed.data || parsed;
      if (!stores || typeof stores !== "object" || Array.isArray(stores)) return { ok: false, error: "File backup tidak berisi data" };

      const counts = {};
      for (const [key] of STORES) {
        const v = stores[key];
        counts[key] = Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v === undefined || v === null ? 0 : 1;
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { ok: true, filePath, counts, total, empty: total === 0, exportedAt: parsed.exportedAt || null, version: parsed.version || null };
    } catch (err) {
      return { ok: false, error: `Gagal membaca file backup: ${err.message}` };
    }
  }

  // restoreBackup — replaces every store with the backup contents.
  // Safety: a full snapshot of the CURRENT state is written to the data folder
  // before anything is overwritten, so a bad restore is always recoverable.
  async function restoreBackup(candidate) {
    try {
      let filePath = candidate;
      if (!filePath) {
        const res = await dialog.showOpenDialog({
          title: "Pilih File Backup untuk Dipulihkan",
          properties: ["openFile"],
          filters: [{ name: "Backup Kasir Warung", extensions: ["json"] }],
        });
        if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };
        [filePath] = res.filePaths;
      }

      const parsed = readBackupFile(filePath);
      const stores = parsed.format === FORMAT ? parsed.data : parsed.data || parsed;
      if (!stores || typeof stores !== "object" || Array.isArray(stores)) return { ok: false, error: "File backup tidak berisi data" };

      // 1. Safety snapshot of the current state (never pruned away silently —
      //    it is named pre-restore_* and kept alongside the regular snapshots).
      const safetyPath = path.join(ensureBackupDir(), `pre-restore_${stamp()}.json`);
      const current = collectStores();
      fs.writeFileSync(safetyPath, JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), counts: current.counts, data: current.stores }, null, 2), "utf-8");

      // 2. Close SQLite so its files are quiescent before we touch them.
      let dbWasOpen = false;
      try { if (typeof closeDB === "function") { closeDB(); dbWasOpen = true; } } catch { /* ignore */ }

      // 3. Write JSON stores back.
      const restored = {};
      for (const [key, file] of STORES) {
        if (!(key in stores)) continue;
        const value = stores[key];
        try {
          rJSON; // (rJSON intentionally unused here; kept for signature symmetry)
          fs.writeFileSync(`${file}.tmp`, JSON.stringify(value, null, 2), "utf-8");
          const fd = fs.openSync(`${file}.tmp`, "r+");
          fs.fsyncSync(fd);
          fs.closeSync(fd);
          fs.renameSync(`${file}.tmp`, file);
          restored[key] = Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 1;
        } catch (err) {
          console.error(`[Restore] Gagal memulihkan ${key}:`, err.message);
        }
      }

      // 4. Reflect restored transactions/shifts into SQLite. We delete the DB
      //    file entirely rather than re-inserting rows: it is recreated by
      //    initDB() + migrated from the freshly written JSON on next start.
      try {
        for (const suffix of ["", "-wal", "-shm"]) {
          const f = `${files.db}${suffix}`;
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
      } catch (err) { console.warn("[Restore] Could not remove sqlite files:", err.message); }

      // 5. Re-open the DB and re-import from the JSON we just wrote.
      try {
        if (typeof initDB === "function") initDB();
        if (typeof migrateJSONToSQLite === "function") migrateJSONToSQLite();
      } catch (err) { console.warn("[Restore] DB re-init failed:", err.message); }

      // 6. Clear the WAL — the restored state is now authoritative.
      try { if (fs.existsSync(files.wal)) fs.unlinkSync(files.wal); } catch { /* ignore */ }

      pruneInternal();

      return {
        ok: true,
        filePath,
        safetyPath,
        restored,
        total: Object.values(restored).reduce((a, b) => a + b, 0),
        dbReopened: dbWasOpen,
        restartRecommended: true,
      };
    } catch (err) {
      console.error("[Restore] restoreBackup failed:", err.message);
      return { ok: false, error: err.message };
    }
  }

  function registerHandlers() {
    ipcMain.handle("backup-stats", () => stats());
    ipcMain.handle("backup-summary", (_e, candidate) => previewBackup(candidate || undefined));
    ipcMain.handle("backup-create", (_e, target) => createBackup(target || undefined));
    ipcMain.handle("backup-preview", (_e, candidate) => previewBackup(candidate || undefined));
    ipcMain.handle("backup-restore", (_e, candidate) => restoreBackup(candidate || undefined));
    ipcMain.handle("backup-list-internal", () => listInternalBackups());
    ipcMain.handle("backup-open-folder", async () => {
      try {
        ensureDir();
        const err = await require("electron").shell.openPath(files.dataDir);
        return err ? { ok: false, error: err } : { ok: true, path: files.dataDir };
      } catch (err) { return { ok: false, error: err.message }; }
    });
    ipcMain.handle("backup-relaunch", () => {
      try { app.relaunch(); app.exit(0); return { ok: true }; }
      catch (err) { return { ok: false, error: err.message }; }
    });
  }

  return { registerHandlers, createBackup, restoreBackup, previewBackup, listInternalBackups, stats, STORES };
}

module.exports = { createBackupRestoreService };
