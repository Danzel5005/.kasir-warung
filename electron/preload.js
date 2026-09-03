const { contextBridge, ipcRenderer } = require("electron");

const kasirAPI = {
  // Transactions
  loadTrx:     ()      => ipcRenderer.invoke("trx-load"),
  saveTrx:     (t)     => ipcRenderer.invoke("trx-save", t),
  deleteTrx:   (id)    => ipcRenderer.invoke("trx-delete", id),
  restoreTrx:  (list)  => ipcRenderer.invoke("trx-restore", list),
  clearTrx:    ()      => ipcRenderer.invoke("trx-clear"),
  // New: Filtered & paginated transactions
  loadTrxFiltered: (filters) => ipcRenderer.invoke("trx-load-filtered", filters),
  getTrxDailyStats: (filters) => ipcRenderer.invoke("trx-get-daily-stats", filters),
  getTrxShiftIds: () => ipcRenderer.invoke("trx-get-shift-ids"),
  // Open Bills
  loadBills:    ()      => ipcRenderer.invoke("bills-load"),
  saveBills:    (list)  => ipcRenderer.invoke("bills-save", list),
  restoreBills: (list)  => ipcRenderer.invoke("bills-restore", list),
  clearBills:   ()      => ipcRenderer.invoke("bills-clear"),
  // Menu
  loadMenu:    ()      => ipcRenderer.invoke("menu-load"),
  saveMenu:    (list)  => ipcRenderer.invoke("menu-save", list),
  // Logo
  loadLogo:    ()      => ipcRenderer.invoke("logo-load"),
  saveLogo:    (data)  => ipcRenderer.invoke("logo-save", data),
  // QRIS
  loadQris:    ()      => ipcRenderer.invoke("qris-load"),
  saveQris:    (map)   => ipcRenderer.invoke("qris-save", map),
  deleteQris:  (key)   => ipcRenderer.invoke("qris-delete", key),
  // Users
  loadUsers:   ()      => ipcRenderer.invoke("users-load"),
  saveUsers:   (list)  => ipcRenderer.invoke("users-save", list),
  // Categories
  loadCats:    ()      => ipcRenderer.invoke("cats-load"),
  saveCats:    (list)  => ipcRenderer.invoke("cats-save", list),
  // Settings
  loadSettings: ()     => ipcRenderer.invoke("settings-load"),
  saveSettings: (d)    => ipcRenderer.invoke("settings-save", d),
  // CSV
  saveCSV:     (data)  => ipcRenderer.invoke("csv-save", data),
  // Printer
  getPrinters:   ()    => ipcRenderer.invoke("get-printers"),
  printReceiptEscPos: (data) => ipcRenderer.invoke("print-receipt-escpos", data),
  printReceipt:  (data)=> ipcRenderer.invoke("print-receipt", data),
  // Shifts
  loadShifts:  ()      => ipcRenderer.invoke("shifts-load"),
  saveShifts:  (list)  => ipcRenderer.invoke("shifts-save", list),
  // License
  checkLicense:    ()    => ipcRenderer.invoke("license-check"),
  activateLicense: (key) => ipcRenderer.invoke("license-activate", key),
  getHardwareId:   ()    => ipcRenderer.invoke("license-hwid"),
  // Info
  getDataPath:  ()      => ipcRenderer.invoke("get-data-path"),
  processPayment: (data) => ipcRenderer.invoke("process-payment", data),
  onBarcodeScanned: (callback) => {
    const listener = (_event, code) => callback(code);
    ipcRenderer.on("barcode-scanned", listener);
    return () => ipcRenderer.removeListener("barcode-scanned", listener);
  },
};

contextBridge.exposeInMainWorld("kasirAPI", kasirAPI);
contextBridge.exposeInMainWorld("api", kasirAPI);
