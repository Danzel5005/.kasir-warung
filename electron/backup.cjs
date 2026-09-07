const fs = require("fs");
const path = require("path");

function createBackupService({ dataDir, files }) {
  function ensureDir() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }

  function rJSON(file) {
    ensureDir();
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
    catch { return null; }
  }

  function atomicWrite(filePath, data) {
    ensureDir();
    const tmp = filePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    const fd = fs.openSync(tmp, "r+");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tmp, filePath);
  }

  function walAppend(trx) {
    ensureDir();
    fs.appendFileSync(files.wal, JSON.stringify({ ts: Date.now(), trx }) + "\n", "utf-8");
  }

  function walClear() {
    try { if (fs.existsSync(files.wal)) fs.unlinkSync(files.wal); }
    catch { /* not fatal */ }
  }

  function walRecover() {
    if (!fs.existsSync(files.wal)) return;
    const raw = fs.readFileSync(files.wal, "utf-8").trim();
    if (!raw) { walClear(); return; }
    const lines = raw.split("\n").filter(Boolean);
    const existing = rJSON(files.trx) || [];
    const existingIds = new Set(existing.map((t) => t.id));
    let recovered = 0;
    for (const line of lines) {
      try {
        const { trx } = JSON.parse(line);
        if (!existingIds.has(trx.id)) {
          existing.unshift(trx);
          existingIds.add(trx.id);
          recovered++;
        }
      } catch { /* skip corrupt WAL lines */ }
    }
    if (recovered > 0) {
      atomicWrite(files.trx, existing);
      console.log(`[WAL] Recovered ${recovered} transaksi yang belum tersimpan`);
    }
    walClear();
  }

  function dailyBackup() {
    if (!fs.existsSync(files.trx)) return;
    const today = new Date().toISOString().slice(0, 10);
    const backupDir = files.backups;
    const backupPath = path.join(backupDir, `trx_${today}.json`);
    if (fs.existsSync(backupPath)) return;
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(files.trx, backupPath);
    console.log(`[Backup] Backup harian dibuat: trx_${today}.json`);
    try {
      const oldBackups = fs.readdirSync(backupDir)
        .filter((file) => file.startsWith("trx_") && file.endsWith(".json"))
        .sort();
      if (oldBackups.length > 30) {
        oldBackups.slice(0, oldBackups.length - 30).forEach((file) => {
          fs.unlinkSync(path.join(backupDir, file));
          console.log(`[Backup] Hapus backup lama: ${file}`);
        });
      }
    } catch { /* not fatal */ }
  }

  return { ensureDir, rJSON, atomicWrite, walAppend, walClear, walRecover, dailyBackup };
}

module.exports = { createBackupService };
