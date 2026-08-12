const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const LICENSE_SECRET = "Q8x-7NqP-Z3mK-4VtR-8H2c-9wL6pX5sJ1";

// ─── LICENSE ──────────────────────────────────────────────────────────────────
function getHardwareId() {
  try {
    const { machineIdSync } = require("node-machine-id");
    const raw = machineIdSync(true).replace(/-/g, "").toUpperCase().slice(0, 16);
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  } catch { return null; }
}

function generateKey(hardwareId) {
  const hash = crypto.createHmac("sha256", LICENSE_SECRET)
    .update(hardwareId.replace(/-/g, "").toUpperCase())
    .digest("hex").toUpperCase();
  const s = hash.slice(0, 20);
  return `YKK-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

function getLicensePath() {
  return path.join(app.getPath("userData"), ".ykk_lic");
}

function checkLicense() {
  const hwid = getHardwareId();
  if (!hwid) return { valid: false, hardwareId: null, reason: "Gagal baca hardware ID" };
  try {
    const raw = fs.readFileSync(getLicensePath(), "utf8");
    const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (generateKey(hwid) !== payload.key) return { valid: false, hardwareId: hwid, reason: "License tidak cocok" };
    return { valid: true, hardwareId: hwid, activatedAt: payload.activatedAt };
  } catch {
    return { valid: false, hardwareId: hwid, reason: "Belum diaktivasi" };
  }
}

function activateLicense(inputKey) {
  const hwid = getHardwareId();
  if (!hwid) return { ok: false, error: "Gagal baca hardware ID" };
  if (inputKey.trim().toUpperCase() !== generateKey(hwid))
    return { ok: false, error: "License key tidak valid untuk perangkat ini" };
  const payload = JSON.stringify({ key: inputKey.trim().toUpperCase(), hwid, activatedAt: new Date().toISOString() });
  fs.writeFileSync(getLicensePath(), Buffer.from(payload).toString("base64"), "utf8");
  return { ok: true };
}
// ─────────────────────────────────────────────────────────────────────────────

const isDev = !app.isPackaged;
const DATA_DIR = path.join(app.getPath("userData"), "data");

const FILES = {
  trx: path.join(DATA_DIR, "transactions.json"),
  bills: path.join(DATA_DIR, "open-bills.json"),
  menu: path.join(DATA_DIR, "menu.json"),
  logo: path.join(DATA_DIR, "logo.json"),
  cats: path.join(DATA_DIR, "categories.json"),
  settings: path.join(DATA_DIR, "settings.json"),
  shifts: path.join(DATA_DIR, "shifts.json"),
  qris: path.join(DATA_DIR, "qris.json"),   // { "qris-bca": base64, "qris-bni": base64 }
  wal: path.join(DATA_DIR, "trx.wal"),
  backups: path.join(DATA_DIR, "backups"),
};

// ─── CORE UTILS ──────────────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Baca JSON — kembalikan null kalau tidak ada atau korup
function rJSON(file) {
  ensureDir();
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return null; }
}

// ─── ATOMIC WRITE ────────────────────────────────────────────────────────────
//
// Cara kerja:
//   1. Tulis ke file .tmp dulu (bukan langsung ke file asli)
//   2. fsync → paksa OS flush dari memory cache ke disk fisik
//   3. rename .tmp → file asli (operasi ini atomic di level OS)
//
// Kalau crash di tengah step 1-2: file asli tidak tersentuh, .tmp yang korup
// Kalau crash di tengah step 3:   OS jamin rename selesai atau tidak sama sekali
//
function atomicWrite(filePath, data) {
  ensureDir();
  const tmp = filePath + ".tmp";
  const json = JSON.stringify(data, null, 2);

  fs.writeFileSync(tmp, json, "utf-8");

  // fsync: paksa flush ke disk, bukan sekadar OS buffer
  const fd = fs.openSync(tmp, "r+");
  fs.fsyncSync(fd);
  fs.closeSync(fd);

  // rename atomic — file lama tetap utuh sampai file baru siap 100%
  fs.renameSync(tmp, filePath);
}

// ─── WRITE-AHEAD LOG (WAL) ───────────────────────────────────────────────────
//
// Cara kerja:
//   Sebelum tulis permanen → append satu baris JSON ke file WAL
//   Setelah tulis permanen berhasil → hapus WAL
//
//   Kalau crash setelah walAppend tapi sebelum atomicWrite selesai:
//   → saat startup berikutnya, walRecover() menemukan WAL
//   → transaksi yang belum masuk dipulihkan otomatis ke transactions.json
//
function walAppend(trx) {
  ensureDir();
  const line = JSON.stringify({ ts: Date.now(), trx }) + "\n";
  fs.appendFileSync(FILES.wal, line, "utf-8");
}

function walClear() {
  try { if (fs.existsSync(FILES.wal)) fs.unlinkSync(FILES.wal); }
  catch { /* tidak fatal */ }
}

// Dipanggil SEKALI saat app startup — sebelum createWindow()
function walRecover() {
  if (!fs.existsSync(FILES.wal)) return;

  const raw = fs.readFileSync(FILES.wal, "utf-8").trim();
  if (!raw) { walClear(); return; }

  const lines = raw.split("\n").filter(Boolean);
  const existing = rJSON(FILES.trx) || [];
  const existingIds = new Set(existing.map(t => t.id));

  let recovered = 0;
  for (const line of lines) {
    try {
      const { trx } = JSON.parse(line);
      if (!existingIds.has(trx.id)) {
        existing.unshift(trx);
        existingIds.add(trx.id);
        recovered++;
      }
    } catch { /* skip baris korup di WAL */ }
  }

  if (recovered > 0) {
    atomicWrite(FILES.trx, existing);
    console.log(`[WAL] Recovered ${recovered} transaksi yang belum tersimpan`);
  }

  walClear();
}

// ─── DAILY BACKUP ────────────────────────────────────────────────────────────
//
// Satu backup per hari — tidak overwrite backup yang sudah ada
// Simpan 30 hari terakhir, yang lebih lama dihapus otomatis
//
function dailyBackup() {
  if (!fs.existsSync(FILES.trx)) return;

  const today = new Date().toISOString().slice(0, 10); // "2026-06-09"
  const backupDir = FILES.backups;
  const backupPath = path.join(backupDir, `trx_${today}.json`);

  // Sudah ada backup hari ini → skip
  if (fs.existsSync(backupPath)) return;

  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  fs.copyFileSync(FILES.trx, backupPath);
  console.log(`[Backup] Backup harian dibuat: trx_${today}.json`);

  // Hapus backup lebih dari 30 hari
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("trx_") && f.endsWith(".json"))
      .sort(); // urutan asc = lama dulu
    if (files.length > 30) {
      files.slice(0, files.length - 30)
        .forEach(f => {
          fs.unlinkSync(path.join(backupDir, f));
          console.log(`[Backup] Hapus backup lama: ${f}`);
        });
    }
  } catch { /* tidak fatal */ }
}

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────

// ── Transactions
ipcMain.handle("trx-load", () => rJSON(FILES.trx) || []);

// trx-save tetap ada untuk keperluan lain (undo restore, dll)
ipcMain.handle("trx-save", (_e, trx) => { const a = rJSON(FILES.trx) || []; a.unshift(trx); atomicWrite(FILES.trx, a); return { ok: true }; });
ipcMain.handle("trx-delete", (_e, id) => { atomicWrite(FILES.trx, (rJSON(FILES.trx) || []).filter(t => t.id !== id)); return { ok: true }; });
ipcMain.handle("trx-restore", (_e, list) => { atomicWrite(FILES.trx, list); return { ok: true }; });
ipcMain.handle("trx-clear", () => { atomicWrite(FILES.trx, []); return { ok: true }; });

// ── Process Payment (ATOMIC — trx + menu + hapus bill dalam satu operasi)
//
// Ini handler terpenting. Tiga file ditulis sekaligus dengan perlindungan WAL.
// App.jsx harus panggil "process-payment" instead of "trx-save" + "menu-save" terpisah.
//
ipcMain.handle("process-payment", (_e, { trx, updatedMenu, activeBillId }) => {
  try {
    // 1. Catat ke WAL dulu — kalau crash setelah ini, transaksi bisa dipulihkan
    walAppend(trx);

    // 2. Tulis transaksi
    const allTrx = rJSON(FILES.trx) || [];
    allTrx.unshift(trx);
    atomicWrite(FILES.trx, allTrx);

    // 3. Tulis menu (update stok)
    if (updatedMenu) atomicWrite(FILES.menu, updatedMenu);

    // 4. Hapus open bill yang sudah dibayar (kalau ada)
    if (activeBillId) {
      const remaining = (rJSON(FILES.bills) || []).filter(b => String(b.id) !== String(activeBillId));
      atomicWrite(FILES.bills, remaining);
    }

    // 5. Semua berhasil — WAL tidak diperlukan lagi
    walClear();

    return { ok: true };
  } catch (err) {
    // WAL masih ada → transaksi akan dipulihkan saat restart berikutnya
    console.error("[process-payment] Error:", err.message);
    return { ok: false, error: err.message };
  }
});

// ── Open Bills
ipcMain.handle("bills-load", () => rJSON(FILES.bills) || []);
ipcMain.handle("bills-save", (_e, list) => { atomicWrite(FILES.bills, list); return { ok: true }; });
ipcMain.handle("bills-restore", (_e, list) => { atomicWrite(FILES.bills, list); return { ok: true }; });
ipcMain.handle("bills-clear", () => { atomicWrite(FILES.bills, []); return { ok: true }; });

// ── Menu
ipcMain.handle("menu-load", () => rJSON(FILES.menu));
ipcMain.handle("menu-save", (_e, list) => { atomicWrite(FILES.menu, list); return { ok: true }; });

// ── Logo
ipcMain.handle("logo-load", () => (rJSON(FILES.logo) || {}).data || null);
ipcMain.handle("logo-save", (_e, data) => { atomicWrite(FILES.logo, { data }); return { ok: true }; });


// ── QRIS Images  { "qris-bca": base64, "qris-bni": base64 }
ipcMain.handle("qris-load", () => rJSON(FILES.qris) || {});
ipcMain.handle("qris-save", (_e, map) => { atomicWrite(FILES.qris, map); return { ok: true }; });
ipcMain.handle("qris-delete", (_e, key) => { const c = rJSON(FILES.qris) || {}; delete c[key]; atomicWrite(FILES.qris, c); return { ok: true }; });
// ── Custom Categories
ipcMain.handle("cats-load", () => rJSON(FILES.cats) || []);
ipcMain.handle("cats-save", (_e, list) => { atomicWrite(FILES.cats, list); return { ok: true }; });

// ── Settings
ipcMain.handle("settings-load", () => rJSON(FILES.settings) || {});
ipcMain.handle("settings-save", (_e, data) => { atomicWrite(FILES.settings, data); return { ok: true }; });

// ── Shifts
ipcMain.handle("shifts-load", () => rJSON(FILES.shifts) || []);
ipcMain.handle("shifts-save", (_e, list) => { atomicWrite(FILES.shifts, list); return { ok: true }; });

// ── CSV
ipcMain.handle("csv-save", async (_e, { filename, content }) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: "Simpan File CSV", defaultPath: filename,
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, "\uFEFF" + content, "utf-8");
  return { ok: true, filePath };
});

// ── Get list of printers
ipcMain.handle("get-printers", async () => {
  const wins = BrowserWindow.getAllWindows();
  if (!wins.length) return [];
  try { return await wins[0].webContents.getPrintersAsync(); }
  catch { return []; }
});

// ── Print receipt
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const RECEIPT_WIDTH_MM = 67;

function injectReceiptPrintCSS(rawHtml = "") {
  const css = `<style id="receipt-override">
    @page { size: A4 portrait; margin: 0; }
    html, body {
      width: ${RECEIPT_WIDTH_MM}mm !important;
      max-width: ${RECEIPT_WIDTH_MM}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * {
      box-sizing: border-box !important;
      word-break: break-word !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>`;

  if (/<\/body>/i.test(rawHtml)) return rawHtml.replace(/<\/body>/i, `${css}</body>`);
  if (/<\/html>/i.test(rawHtml)) return rawHtml.replace(/<\/html>/i, `${css}</html>`);
  return rawHtml + css;
}

ipcMain.handle("print-receipt", (_e, { html, printerName }) => {
  return new Promise((resolve) => {
    ensureDir();

    const win = new BrowserWindow({
      width: Math.ceil((PAGE_WIDTH_MM / 25.4) * 96),
      height: Math.ceil((PAGE_HEIGHT_MM / 25.4) * 96),
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const printFile = path.join(DATA_DIR, "receipt-print.html");
    fs.writeFileSync(printFile, injectReceiptPrintCSS(html), "utf-8");
    win.loadFile(printFile);

    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName || "",
            margins: { marginType: "none" },
            pageSize: { width: PAGE_WIDTH_MM * 1000, height: PAGE_HEIGHT_MM * 1000 },
            scaleFactor: 100,
          },
          (success, errType) => {
            setTimeout(() => win.close(), 500);
            resolve({ ok: success, error: errType || null });
          }
        );
      }, 250);
    });

    win.webContents.once("did-fail-load", (_event, _code, description) => {
      setTimeout(() => win.close(), 500);
      resolve({ ok: false, error: description || "Gagal memuat halaman cetak resi" });
    });
  });
});

// ── License
ipcMain.handle("license-check", () => checkLicense());
ipcMain.handle("license-activate", (_e, key) => activateLicense(key));
ipcMain.handle("license-hwid", () => getHardwareId());

// ── Data path
ipcMain.handle("get-data-path", () => DATA_DIR);

// ─── WINDOW ───────────────────────────────────────────────────────────────────

let mainWin;
function createWindow() {
  mainWin = new BrowserWindow({
    width: 1400, height: 860, minWidth: 1020, minHeight: 680,
    title: "Kasir — restaurant",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWin.setMenuBarVisibility(false);
  if (isDev) mainWin.loadURL("http://localhost:5173");
  else mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  // Jalankan recovery & backup SEBELUM window dibuka
  walRecover();   // pulihkan transaksi yang crash sebelum tersimpan
  dailyBackup();  // buat backup harian kalau belum ada hari ini

  createWindow();
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
