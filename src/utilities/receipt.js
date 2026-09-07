import {METODE_LABELS} from "../constants/payments.js";
import {calcPrice} from "./calculations.js";

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function getNow() {
  const d = new Date();
  return {
    timestamp:d.toISOString(),
    hari:HARI[d.getDay()], tgl:String(d.getDate()).padStart(2,"0"),
    bln:BULAN[d.getMonth()], blnNum:String(d.getMonth()+1).padStart(2,"0"),
    thn:String(d.getFullYear()),
    jam:String(d.getHours()).padStart(2,"0"),
    mnt:String(d.getMinutes()).padStart(2,"0"),
    dtk:String(d.getSeconds()).padStart(2,"0"),
  };
}

const fmt   = (n) => `Rp ${Number(n||0).toLocaleString("id-ID")}`;
const fmtNum = (n) => Number(n||0).toLocaleString("id-ID");
const DEFAULT_WARUNG = "Warung";

// Paper width (mm) for @page size — configurable from Printer settings.
// Clamped to a sane thermal-printer range; invalid values fall back to 80mm.
const DEFAULT_PAPER_WIDTH_MM = 80;
const MIN_PAPER_WIDTH_MM = 30;
const MAX_PAPER_WIDTH_MM = 210;
const normalizePaperWidth = (w) => {
  const n = Math.round(Number(w));
  if (!Number.isFinite(n)) return DEFAULT_PAPER_WIDTH_MM;
  return Math.min(MAX_PAPER_WIDTH_MM, Math.max(MIN_PAPER_WIDTH_MM, n));
};

// Shared print CSS so @page size always matches the configured paper width
const buildPrintCSS = (paperWidthMm) => {
  const w = normalizePaperWidth(paperWidthMm);
  return `
    @page{size:${w}mm auto;margin:0mm;}
    body{width:${w}mm;padding:2mm;}
  `;
};

// Helper function to format drink additionals (cupsize/sugar/temperature)
const formatAdditionals = (additionals) => {
  if (!additionals) return "";
  const parts = [];
  if (additionals.cupsize) parts.push(additionals.cupsize);
  if (additionals.sugar) parts.push(additionals.sugar);
  if (additionals.temperature) {
    if (additionals.temperature === "ice" && additionals.ice_level) {
      parts.push(`${additionals.temperature} (${additionals.ice_level})`);
    } else {
      parts.push(additionals.temperature);
    }
  }
  return parts.join(" • ");
};

// Build receipt additional fields (from Resi settings) into KV rows
const buildAdditionalFields = (data, receiptAdditionals) => {
  if (!receiptAdditionals || !receiptAdditionals.length) return "";
  return receiptAdditionals
    .filter(f => f.category === "receipt" && f.visible !== false)
    .map(field => {
      const val = data?.[field.key];
      if (val === undefined || val === null || val === "") return "";
      return `<div class="kv"><span class="k">${field.label.toUpperCase()}</span><span class="v">${val}</span></div>`;
    })
    .join("");
};

// Detect QRIS image for a given payment method
// Custom QRIS methods may have keys like "custom_12345", so we check both the key prefix
// and also if the qrisImages object has an entry for this method key
const getQrisImage = (metodeBayar, qrisImages) => {
  if (!metodeBayar || !qrisImages) return null;
  // First check if the key starts with "qris" (legacy/default QRIS methods)
  if (metodeBayar.startsWith("qris")) {
    return qrisImages[metodeBayar] || null;
  }
  // For custom payment methods, check if qrisImages has an entry for this key
  // (this covers custom QRIS methods with keys like "custom_12345")
  return qrisImages[metodeBayar] || null;
};

// Get category display name (resolves persisted key/id to the current label)
const getCategoryName = (cat, cats) => {
  if (!cat) return "Lainnya";
  if (cats && cats.length) {
    const found = cats.find(c => String(c.key ?? c.id) === String(cat));
    if (found) return found.label || found.name || cat;
  }
  return cat;
};

// Calculate category totals (with key-to-label resolution)
const buildCategoryTotals = (items, cats = []) => {
  const taggedCategories = {};
  const untaggedCategories = {};

  items.forEach(item => {
    const cat = item.kategori || "Lainnya";
    const qty = item.qty || 0;
    const isRokok = item.tags?.includes("rokok") || item.kategori?.toLowerCase() === "rokok";
    const catLabel = getCategoryName(cat, cats);

    if (isRokok) {
      if (!taggedCategories["ROKOK"]) taggedCategories["ROKOK"] = 0;
      taggedCategories["ROKOK"] += qty;
    } else if (item.tags && item.tags.length > 0) {
      item.tags.forEach(tag => {
        if (!taggedCategories[tag]) taggedCategories[tag] = 0;
        taggedCategories[tag] += qty;
      });
    } else {
      if (!untaggedCategories[catLabel]) untaggedCategories[catLabel] = 0;
      untaggedCategories[catLabel] += qty;
    }
  });

  return { taggedCategories, untaggedCategories };
};

function buildReceiptHTML(trx, logo, receiptAdditionals, qrisImages, warungName, cats = [], warungAddress = "", warungPhone = "", paymentMethods = [], paperWidthMm = DEFAULT_PAPER_WIDTH_MM) {
  // Use stored tax/service from transaction (no recalculation)
  const pajak = trx.pajak || 0;
  const service = trx.service || 0;
  const discount = trx.discount || 0;
  const total = trx.total || trx.subtotal;
  // Use stored label from transaction, fallback to lookup, NEVER show raw key
  const metodeLabel = trx.metodeBayarLabel 
    ?? paymentMethods.find(m => m.key === trx.metodeBayar)?.label 
    ?? globalThis.METODE_LABELS?.[trx.metodeBayar] 
    ?? trx.metodeBayar.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const qrisImage = getQrisImage(trx.metodeBayar, qrisImages);
  const addFields = buildAdditionalFields(trx, receiptAdditionals);
  const storeName = warungName || trx.warungName || DEFAULT_WARUNG; // [11] dynamic custom name
  const operatorName = trx.operator || "Kasir"; // [2] dynamic operator name from transaction
  const addressLine = warungAddress || trx.warungAddress || "";
  const phoneLine = warungPhone || trx.warungPhone || "";
  const { taggedCategories, untaggedCategories } = buildCategoryTotals(trx.items, cats);

  const rows = trx.items.map(i=>{
    const addStr = formatAdditionals(i.additionals);
    const catLabel = i.kategori ? getCategoryName(i.kategori, cats) : "";
    const itemTotal = fmt(i.harga * i.qty);
    const unitPrice = fmt(i.harga);
    const qtyCatName = catLabel ? `${i.qty} ${catLabel} ${i.nama}` : `${i.qty}x ${i.nama}`;
    return `<div class="item">
      <div class="item-row1"><span>${qtyCatName}</span><span>${itemTotal}</span></div>
      <div class="item-row2"><span style="color: white;">_______</span><span>${unitPrice}</span></div>
      ${addStr?`<div class="item-row2"><span>${addStr}</span></div>`:""}
    </div>`
  }).join("");

  const renderCatTotals = (catMap) => Object.entries(catMap)
    .map(([catKey, qty]) => `<div class="cat-line"><span>TOTAL (${getCategoryName(catKey, cats)}) :</span><span>${qty}</span></div>`)
    .join("");

  // Calculate total quantity of all items for subtotal
  const totalQty = trx.items.reduce((sum, item) => sum + (item.qty || 0), 0);

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8"><style>
    :root{
      --paper:#fdfdf9; --ink:#1c1c1c; --muted:#1c1c1c; --line:#1c1c1c;
      --bg:#eceae2; --header-tag:#c0392b; --body-tag:#1f6f50; --footer-tag:#2f5aa8;
        }
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:700;}
    body{font-family:'Courier New', ui-monospace, Menlo, monospace;font-size:12px;width:${paperWidthMm}mm;padding:3mm;color:var(--ink);background:var(--bg);font-weight:700;}

    @media print{
${buildPrintCSS(paperWidthMm)}
        }
    .receipt{background:var(--paper);padding:6px 8px 2px;position:relative;}
    .section{position:relative;padding:6px 0;}
    .section + .section{border-top:1px dashed #999;}
    .center{text-align:center;} .bold{font-weight:700;}
    .store-name{font-size:15px;font-weight:700;} .store-line{font-size:12px;margin-top:2px;font-weight:700;}
    .kv{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin:2px 0;font-weight:700;}
    .kv .k{font-weight:700;white-space:nowrap;} .kv .v{text-align:right;font-weight:700;}
    .item{margin:6px 0;font-size:12.5px;font-weight:700;}
    .item-row1{display:flex;justify-content:space-between;gap:6px;font-weight:700;}
    .item-row2{display:flex;justify-content:flex-start;font-size:11.5px;margin-top:1px;font-weight:700;}
    .item-tag{font-size:10px;border:1px solid #bbb;border-radius:3px;padding:0 4px;font-weight:700;}
    .dst{text-align:center;font-size:12px;margin:6px 0;font-weight:700;}
    .totals{margin-top:6px;border-top:1px dashed #999;padding-top:6px;font-weight:700;}
    .totals .kv.grand{font-size:14px;padding-top:4px;margin-top:4px;border-top:1px solid var(--line);font-weight:700;}
    .payment-note{margin-top:8px;text-align:center;font-size:11.5px;border:1px dashed #999;padding:6px;font-weight:700;}
    .qris-img{display:block;margin:8px auto;max-width:60mm;max-height:60mm;}
    .footer-note{text-align:center;font-size:11px;margin-top:8px;font-weight:700;}
    .cat-line{display:flex;justify-content:space-between;font-size:12px;margin:3px 0;font-weight:700;}
    .footer-list{font-size:11px;margin-top:6px;font-weight:700;}
    .footer-list div{margin:2px 0;font-weight:700;}
  </style>
  </head>
  <body>
    <div class="receipt">
      <!-- HEADER -->
      <div class="section header">
        ${logo?`<img src="${logo}" class="qris-img" style="max-height:30mm;max-width:30mm;border-radius:4px;" /><br/>`:""}
        <div class="store-name center bold">${storeName}</div>
        ${addressLine?`<div class="store-line center">${addressLine}</div>`:""}
        ${phoneLine?`<div class="store-line center">Telp: ${phoneLine}</div>`:""}
        <div class="store-line center">${trx.hari}, ${trx.tgl} ${trx.bln} ${trx.thn} &bull; ${trx.jam}:${trx.mnt}:${trx.dtk}</div>
        <div class="kv"><span class="k">NO TRX</span><span class="v">${trx.id}</span></div>
        ${addFields}
        <div class="kv"><span class="k">KASIR</span><span class="v">${operatorName}</span></div>
        <div class="kv"><span class="k">METODE</span><span class="v">${metodeLabel}</span></div>
      </div>

      <!-- BODY -->
      <div class="section body">
        ${rows}
        <div class="totals">
          <div class="kv"><span class="k">SubTotal</span><span class="v">${fmt(trx.subtotal)}</span></div>
          ${discount > 0 ? `<div class="kv"><span class="k">Diskon</span><span class="v">-${fmt(discount)}</span></div>` : ""}
          ${pajak > 0 ? `<div class="kv"><span class="k">Pajak</span><span class="v">${fmt(pajak)}</span></div>` : ""}
          ${service > 0 ? `<div class="kv"><span class="k">Service</span><span class="v">${fmt(service)}</span></div>` : ""}
          <div class="kv grand bold"><span class="k">TOTAL</span><span class="v">${fmt(total)}</span></div>
          ${trx.metodeBayar==="cash"?`<div class="kv"><span class="k">Bayar</span><span class="v">${fmt(trx.bayar)}</span></div><div class="kv"><span class="k">Kembalian</span><span class="v">${fmt(trx.kembalian)}</span></div>`:""}
        </div>
        <div class="payment-note">${trx.metodeBayar==="cash"?"LUNAS":"____"}</div>
        ${qrisImage?`<img src="${qrisImage}" class="qris-img" alt="QRIS" />`:""}
      </div>

      <!-- FOOTER -->
      <div class="section footer">
        <div class="cat-line"><span>SUBTOTAL ITEMS :</span><span>${totalQty}</span></div>
        ${Object.keys(untaggedCategories).length ? `<div class="footer-list">${renderCatTotals(untaggedCategories)}</div>` : ""}
        ${Object.keys(taggedCategories).length ? `<div class="footer-list"><div class="bold">TAGGED</div>${renderCatTotals(taggedCategories)}</div>` : ""}
        <div class="footer-note">Barang yang sudah dibeli tidak bisa<br/>dikembalikan<br/>Terimakasih</div>
      </div>
    </div>
  </body></html>`;
}

function buildPreviewHTML(receiptAdditionalValues, items, logo, receiptAdditionals, warungName, cats = [], warungAddress = "", warungPhone = "", paperWidthMm = DEFAULT_PAPER_WIDTH_MM, pricingConfig = {}) {
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
  const { pajak, service, discount, total } = calcPrice(subtotal, { ...pricingConfig, items });
  const t = getNow();
  const addFields = buildAdditionalFields(receiptAdditionalValues, receiptAdditionals);
  const storeName = warungName || DEFAULT_WARUNG;
  const addressLine = warungAddress || "";
  const phoneLine = warungPhone || "";
  const { taggedCategories, untaggedCategories } = buildCategoryTotals(items, cats);

  const rows = items.map(i => {
    const addStr = formatAdditionals(i.additionals);
    const catLabel = i.kategori ? getCategoryName(i.kategori, cats) : "";
    const itemTotal = fmt(i.harga * i.qty);
    const unitPrice = fmt(i.harga);
    const qtyCatName = catLabel ? `${i.qty} ${catLabel} ${i.nama}` : `${i.qty}x ${i.nama}`;
    return `<div class="item">
      <div class="item-row1"><span>${qtyCatName}</span><span>${itemTotal}</span></div>
      <div class="item-row2"><span>${unitPrice}</span></div>
      ${addStr?`<div class="item-row2"><span>${addStr}</span></div>`:""}
    </div>`
  }).join("");

  const renderCatTotals = (catMap) => Object.entries(catMap)
    .map(([catKey, qty]) => `<div class="cat-line"><span>TOTAL (${getCategoryName(catKey, cats)}) :</span><span>${qty}</span></div>`)
    .join("");

  // Calculate total quantity of all items for subtotal
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root{
      --paper:#fdfdf9; --ink:#1c1c1c; --muted:#1c1c1c; --line:#1c1c1c;
      --bg:#eceae2; --header-tag:#c0392b; --body-tag:#1f6f50; --footer-tag:#2f5aa8;
    }
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:700;}
    body{font-family:'Courier New', ui-monospace, Menlo, monospace;font-size:12px;width:${paperWidthMm}mm;padding:3mm;color:var(--ink);background:var(--bg);font-weight:700;}
    @media print{
${buildPrintCSS(paperWidthMm)}
    }
    .receipt{background:var(--paper);padding:6px 8px 2px;position:relative;}
    .section{position:relative;padding:6px 0;}
    .section + .section{border-top:1px dashed #999;}
    .center{text-align:center;} .bold{font-weight:700;}
    .store-name{font-size:15px;font-weight:700;} .store-line{font-size:12px;margin-top:2px;font-weight:700;}
    .kv{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin:2px 0;font-weight:700;}
    .kv .k{font-weight:700;white-space:nowrap;} .kv .v{text-align:right;font-weight:700;}
    .item{margin:6px 0;font-size:12.5px;font-weight:700;}
    .item-row1{display:flex;justify-content:space-between;gap:6px;font-weight:700;}
    .item-row2{display:flex;justify-content:flex-start;font-size:11.5px;margin-top:1px;font-weight:700;}
    .item-tag{font-size:10px;border:1px solid #bbb;border-radius:3px;padding:0 4px;font-weight:700;}
    .dst{text-align:center;font-size:12px;margin:6px 0;font-weight:700;}
    .totals{margin-top:6px;border-top:1px dashed #999;padding-top:6px;font-weight:700;}
    .totals .kv.grand{font-size:14px;padding-top:4px;margin-top:4px;border-top:1px solid var(--line);font-weight:700;}
    .preview-tag{text-align:center;font-size:9px;margin-top:4px;font-weight:700;}
    .footer-note{text-align:center;font-size:11px;margin-top:8px;font-weight:700;}
    .cat-line{display:flex;justify-content:space-between;font-size:12px;margin:3px 0;font-weight:700;}
    .footer-list{font-size:11px;margin-top:6px;font-weight:700;}
    .footer-list div{margin:2px 0;font-weight:700;}
  </style></head><body>
    <div class="receipt">
      <div class="section header">
        ${logo?`<img src="${logo}" style="display:block;margin:0 auto 4px;max-height:30mm;max-width:30mm;border-radius:4px;" /><br/>`:""}
        <div class="store-name center bold">${storeName}</div>
        ${addressLine?`<div class="store-line center">${addressLine}</div>`:""}
        ${phoneLine?`<div class="store-line center">Telp: ${phoneLine}</div>`:""}
        <div class="store-line center">${t.hari}, ${t.tgl} ${t.bln} ${t.thn} &bull; ${t.jam}:${t.mnt}</div>
        ${addFields}
      </div>
      <div class="section body">
        ${rows}
        <div class="totals">
          <div class="kv"><span class="k">SubTotal</span><span class="v">${fmt(subtotal)}</span></div>
          ${discount > 0 ? `<div class="kv"><span class="k">Diskon</span><span class="v">-${fmt(discount)}</span></div>` : ""}
          ${pajak > 0 ? `<div class="kv"><span class="k">Pajak</span><span class="v">${fmt(pajak)}</span></div>` : ""}
          ${service > 0 ? `<div class="kv"><span class="k">Service</span><span class="v">${fmt(service)}</span></div>` : ""}
          <div class="kv grand bold"><span class="k">TOTAL</span><span class="v">${fmt(total)}</span></div>
        </div>
      </div>
      <div class="section footer">
        <div class="cat-line"><span>SUBTOTAL ITEMS :</span><span>${totalQty}</span></div>
        ${Object.keys(untaggedCategories).length ? `<div class="footer-list">${renderCatTotals(untaggedCategories)}</div>` : ""}
        ${Object.keys(taggedCategories).length ? `<div class="footer-list"><div class="bold">TAGGED</div>${renderCatTotals(taggedCategories)}</div>` : ""}
        <div class="footer-note">Belum Lunas</div>
      </div>
    </div>
  </body></html>`;
}

export {buildReceiptHTML, buildPreviewHTML, fmt, fmtNum, DEFAULT_WARUNG, DEFAULT_PAPER_WIDTH_MM, getCategoryName};