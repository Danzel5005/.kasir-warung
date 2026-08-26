const { BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(require("electron").app.getPath("userData"), "kasir-warung");

// ─── Print Constants ───────────────────────────────────────────────────────────

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DEFAULT_RECEIPT_WIDTH_MM = 80;
const MIN_PAPER_WIDTH_MM = 30;
const MAX_PAPER_WIDTH_MM = 210;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function normalizePaperWidthMm(w) {
  const n = Math.round(Number(w));
  if (!Number.isFinite(n)) return DEFAULT_RECEIPT_WIDTH_MM;
  return Math.min(MAX_PAPER_WIDTH_MM, Math.max(MIN_PAPER_WIDTH_MM, n));
}

/**
 * Build print CSS that sets A4 page size with no margins,
 * but constrains body/content to the configured receipt width.
 */
function buildPrintCSS(paperWidthMm) {
  const w = normalizePaperWidthMm(paperWidthMm);
  return `
    @page {
      size: ${A4_WIDTH_MM}mm ${A4_HEIGHT_MM}mm;
      margin: 0;
    }
    html, body {
      width: ${w}mm !important;
      max-width: 210mm !important;
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
  `;
}

/**
 * Inject print CSS into raw HTML
 */
function injectPrintCSS(rawHtml, paperWidthMm) {
  const css = buildPrintCSS(paperWidthMm);
  const styleTag = `<style id="receipt-print-override">${css}</style>`;

  if (/<\/body>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/body>/i, `${styleTag}</body>`);
  }
  if (/<\/html>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/html>/i, `${styleTag}</html>`);
  }
  return rawHtml + styleTag;
}

/**
 * Print receipt using a hidden BrowserWindow
 * @param {Object} options
 * @param {string} options.html - Receipt HTML content
 * @param {string} [options.printerName] - Target printer name
 * @param {number} [options.paperWidthMm] - Receipt content width in mm (e.g., 80, 58)
 * @returns {Promise<{ok: boolean, error: string|null}>}
 */
function printReceipt({ html, printerName, paperWidthMm }) {
  return new Promise((resolve) => {
    ensureDir();

    const paperW = normalizePaperWidthMm(paperWidthMm);

    const win = new BrowserWindow({
      width: Math.ceil((A4_WIDTH_MM / 25.4) * 96),
      height: Math.ceil((A4_HEIGHT_MM / 25.4) * 96),
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    const printFile = path.join(DATA_DIR, "receipt-print.html");
    fs.writeFileSync(printFile, injectPrintCSS(html, paperW), "utf-8");
    win.loadFile(printFile);

    win.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        win.webContents.print(
          {
            silent: true,
            printBackground: true,
            deviceName: printerName || "",
            margins: { marginType: "none" },
            pageSize: { width: A4_WIDTH_MM * 1000, height: A4_HEIGHT_MM * 1000 },
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
}

/**
 * Get list of available printers
 */
async function getPrinters() {
  const wins = BrowserWindow.getAllWindows();
  if (!wins.length) return [];
  try {
    return await wins[0].webContents.getPrintersAsync();
  } catch {
    return [];
  }
}

module.exports = {
  printReceipt,
  getPrinters,
  buildPrintCSS,
  injectPrintCSS,
  normalizePaperWidthMm,
  DEFAULT_RECEIPT_WIDTH_MM,
  MIN_PAPER_WIDTH_MM,
  MAX_PAPER_WIDTH_MM,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
};