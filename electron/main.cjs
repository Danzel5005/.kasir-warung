const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { createLicenseService, getHardwareId } = require("./license.cjs");
const { createBackupService } = require("./backup.cjs");
const { createDatabaseService } = require("./db.cjs");
const { createPrintingService } = require("./printing.cjs");

let NodePrinterDriver = null;
try { NodePrinterDriver = require("electron-printer"); }
catch (err) { console.warn("[Main] electron-printer unavailable; continuing without legacy native printer driver:", err.message); }

const isDev = !app.isPackaged;
const DATA_DIR = path.join(app.getPath("userData"), "data");
const FILES = {
  dataDir: DATA_DIR,
  trx: path.join(DATA_DIR, "transactions.json"),
  bills: path.join(DATA_DIR, "open-bills.json"),
  menu: path.join(DATA_DIR, "menu.json"),
  logo: path.join(DATA_DIR, "logo.json"),
  cats: path.join(DATA_DIR, "categories.json"),
  settings: path.join(DATA_DIR, "settings.json"),
  shifts: path.join(DATA_DIR, "shifts.json"),
  qris: path.join(DATA_DIR, "qris.json"),
  users: path.join(DATA_DIR, "users.json"),
  wal: path.join(DATA_DIR, "trx.wal"),
  backups: path.join(DATA_DIR, "backups"),
  db: path.join(DATA_DIR, "kasir.db"),
  jsonBackups: path.join(DATA_DIR, "json-backups"),
};

const backup = createBackupService({ dataDir: DATA_DIR, files: FILES });
const license = createLicenseService(app);
const database = createDatabaseService({ ipcMain, files: FILES, ensureDir: backup.ensureDir, rJSON: backup.rJSON, atomicWrite: backup.atomicWrite, walAppend: backup.walAppend, walClear: backup.walClear });

function registerFileHandlers() {
  ipcMain.handle("bills-load", () => backup.rJSON(FILES.bills) || []);
  ipcMain.handle("bills-save", (_e, list) => { backup.atomicWrite(FILES.bills, list); return { ok: true }; });
  ipcMain.handle("bills-restore", (_e, list) => { backup.atomicWrite(FILES.bills, list); return { ok: true }; });
  ipcMain.handle("bills-clear", () => { backup.atomicWrite(FILES.bills, []); return { ok: true }; });
  ipcMain.handle("menu-load", () => backup.rJSON(FILES.menu));
  ipcMain.handle("menu-save", (_e, list) => { backup.atomicWrite(FILES.menu, list); return { ok: true }; });
  ipcMain.handle("logo-load", () => (backup.rJSON(FILES.logo) || {}).data || null);
  ipcMain.handle("logo-save", (_e, data) => { backup.atomicWrite(FILES.logo, { data }); return { ok: true }; });
  ipcMain.handle("qris-load", () => backup.rJSON(FILES.qris) || {});
  ipcMain.handle("qris-save", (_e, map) => { backup.atomicWrite(FILES.qris, map); return { ok: true }; });
  ipcMain.handle("qris-delete", (_e, key) => { const current = backup.rJSON(FILES.qris) || {}; delete current[key]; backup.atomicWrite(FILES.qris, current); return { ok: true }; });
  ipcMain.handle("cats-load", () => backup.rJSON(FILES.cats) || []);
  ipcMain.handle("cats-save", (_e, list) => { backup.atomicWrite(FILES.cats, list); return { ok: true }; });
  ipcMain.handle("settings-load", () => backup.rJSON(FILES.settings) || {});
  ipcMain.handle("settings-save", (_e, data) => { backup.atomicWrite(FILES.settings, data); return { ok: true }; });
  ipcMain.handle("users-load", () => backup.rJSON(FILES.users) || []);
  ipcMain.handle("users-save", (_e, list) => { backup.atomicWrite(FILES.users, list); return { ok: true }; });
  ipcMain.handle("csv-save", async (_e, { filename, content }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({ title: "Simpan File CSV", defaultPath: filename, filters: [{ name: "CSV Files", extensions: ["csv"] }] });
    if (canceled || !filePath) return { ok: false };
    fs.writeFileSync(filePath, "\uFEFF" + content, "utf-8");
    return { ok: true, filePath };
  });
}

function registerLicenseHandlers() {
  ipcMain.handle("license-check", () => license.checkLicense());
  ipcMain.handle("license-activate", (_e, key) => license.activateLicense(key));
  ipcMain.handle("license-hwid", () => getHardwareId());
  ipcMain.handle("get-data-path", () => DATA_DIR);
}

let rawScanner = null;
let HID = null;
try { HID = require("node-hid"); }
catch (err) { console.warn("[Main] node-hid not available; using keyboard wedge only:", err.message); }

function startRawScannerFallback(win) {
  if (!HID || !win) return;
  try {
    const devices = HID.devices ? HID.devices() : [];
    const candidate = devices.find((device) => /scanner|barcode|reader|usb hid/i.test(`${device.product || ""} ${device.manufacturer || ""} ${device.serialNumber || ""}`.toLowerCase()));
    if (!candidate) { console.warn("[Main] No raw HID scanner detected; keyboard wedge remains primary path"); return; }
    rawScanner = new HID.HID(candidate.vendorId, candidate.productId);
    rawScanner.on("data", (chunk) => {
      const code = Buffer.from(chunk).toString("utf8").replace(/[\r\n]+/g, "").trim();
      if (code) win.webContents.send("barcode-scanned", code);
    });
    rawScanner.on("error", (err) => console.warn("[Main] Raw scanner error:", err?.message || err));
    console.log("[Main] Raw HID barcode scanner connected:", candidate.product || "Unknown device");
  } catch (err) { console.warn("[Main] Raw HID scanner fallback unavailable:", err.message); }
}

registerFileHandlers();
database.registerHandlers();
registerLicenseHandlers();
createPrintingService({ app, ipcMain, BrowserWindow, dialog, dataDir: DATA_DIR, ensureDir: backup.ensureDir, rJSON: backup.rJSON, files: FILES, nodePrinterDriver: NodePrinterDriver });

function createWindow() {
  console.log("[Main] Creating BrowserWindow...");
  const mainWin = new BrowserWindow({ width: 1400, height: 860, minWidth: 1020, minHeight: 680, title: "Kasir — Warung", webPreferences: { preload: path.join(__dirname, "preload.js"), nodeIntegration: false, contextIsolation: true } });
  mainWin.setMenuBarVisibility(false);
  if (isDev) mainWin.loadURL("http://localhost:5173");
  else mainWin.loadFile(path.join(__dirname, "../dist/index.html"));
  mainWin.webContents.on("did-finish-load", () => startRawScannerFallback(mainWin));
  mainWin.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => console.error("[Main] Failed to load:", errorCode, errorDescription));
}

app.whenReady().then(() => {
  console.log("[Main] App ready, initializing...");
  process.on("uncaughtException", (err) => console.error("[Main] Uncaught exception:", err));
  process.on("unhandledRejection", (reason) => console.error("[Main] Unhandled rejection:", reason));
  try {
    database.initDB();
    database.migrateJSONToSQLite();
    backup.walRecover();
    backup.dailyBackup();
    createWindow();
  } catch (err) { console.error("[Main] Error during startup:", err); }
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on("window-all-closed", () => {
  database.closeDB();
  if (process.platform !== "darwin") app.quit();
});
