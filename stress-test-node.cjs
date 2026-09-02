/**
 * Standalone Stress Test - Generates 100,000 transactions directly into SQLite database
 * Run with: node stress-test-node.js
 * 
 * This script:
 * 1. Connects directly to the Kasir Warung SQLite database
 * 2. Generates 100,000 transactions using your existing menu items
 * 3. Uses batch transactions for performance
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// YOUR MENU ITEMS (from menu copy.js.txt)
// ============================================
const MENU_ITEMS = [
  {
    "id": "c_1787618078963",
    "nama": "FILTER 12",
    "harga": 517000,
    "modal": 450000,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null,
    "menuId": "F-10023"
  },
  {
    "id": "c_1787618095361",
    "nama": "SUPER 12",
    "harga": 228500,
    "modal": 170000,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null,
    "menuId": "MS-1001"
  },
  {
    "id": "c_1787618147844",
    "nama": "MILD 16",
    "harga": 351000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618394589",
    "nama": "SURYA 12",
    "harga": 258500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618419689",
    "nama": "MAGNUM HTM",
    "harga": 262000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618441761",
    "nama": "MAGNUM BINTANG",
    "harga": 231000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618456355",
    "nama": "NESTLITE MENTHOL",
    "harga": 216500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618474668",
    "nama": "NESTLITE PUTIH",
    "harga": 216500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618486915",
    "nama": "NESTLITE HITAM",
    "harga": 216500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618501210",
    "nama": "DIPLOMAT EVO",
    "harga": 257500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618533473",
    "nama": "ESSE CHANGE 20",
    "harga": 401000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618551840",
    "nama": "MARLBORO MERAH",
    "harga": 519000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618569006",
    "nama": "MARLBORO FIL 20",
    "harga": 389000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618624121",
    "nama": "SUPER 16",
    "harga": 307500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618634552",
    "nama": "SK",
    "harga": 153000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618647789",
    "nama": "SK PRIMA HTM",
    "harga": 152000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618658798",
    "nama": "SAMSU 12",
    "harga": 194000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618678304",
    "nama": "GG JAYA",
    "harga": 135500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618705806",
    "nama": "JUARA KRETEK",
    "harga": 131000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618724089",
    "nama": "DJARUM COKLAT 12",
    "harga": 163500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618733593",
    "nama": "76 APEL",
    "harga": 145000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618746664",
    "nama": "MUSTANG",
    "harga": 165500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618758782",
    "nama": "ZIGA",
    "harga": 166000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618781342",
    "nama": "CAMEL PURPLE 16",
    "harga": 247500,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618847617",
    "nama": "CAMEL BIRU 16",
    "harga": 220000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618872837",
    "nama": "AROMA MILE 16",
    "harga": 219000,
    "modal": 0,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618890259",
    "nama": "KOMIX ANAK OBH",
    "harga": 31500,
    "modal": 0,
    "kategori": "cat_1787618029936",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618915719",
    "nama": "SOFFEL JERUK 1000",
    "harga": 57500,
    "modal": 0,
    "kategori": "cat_1787618036138",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618932504",
    "nama": "KOREK KUPING",
    "harga": 10000,
    "modal": 0,
    "kategori": "cat_1787618036138",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618948193",
    "nama": "KOPI LIONG",
    "harga": 35000,
    "modal": 0,
    "kategori": "cat_1787618036138",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787618969350",
    "nama": "KAPAL API MIX",
    "harga": 195000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619442371",
    "nama": "GOODDAY CAPPUCINO",
    "harga": 240000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619459830",
    "nama": "KAPAL API KECIL",
    "harga": 185000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619517768",
    "nama": "INDOCAFE",
    "harga": 785000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619546414",
    "nama": "LUWAK WHITE KOPI",
    "harga": 175000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619568789",
    "nama": "NEXTAR COKLAT BARU",
    "harga": 153000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619584256",
    "nama": "ROMA ARDEN",
    "harga": 165000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619604971",
    "nama": "SUPERSTAR BARU",
    "harga": 166000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619623662",
    "nama": "KACANG ATOM 1000",
    "harga": 49500,
    "modal": 0,
    "kategori": "cat_1787618049502",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619660842",
    "nama": "SARIMI GORENG KREMES",
    "harga": 86000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619688440",
    "nama": "SUSU BENDERA COKLAT SAK",
    "harga": 153000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619709546",
    "nama": "SUSU BENDERA PUTIH SAK",
    "harga": 153000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619727344",
    "nama": "GARAM 500GR",
    "harga": 68000,
    "modal": 0,
    "kategori": "cat_1787618049502",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619745704",
    "nama": "MIE DOROKO",
    "harga": 91000,
    "modal": 0,
    "kategori": "cat_1787618049502",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619775012",
    "nama": "SASA 5000",
    "harga": 362000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619799048",
    "nama": "KECAP BANGO 720GR",
    "harga": 255000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619824106",
    "nama": "KECAP BANGO 77 GR/3000",
    "harga": 114000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619841615",
    "nama": "RINSO CAIR MOLTO",
    "harga": 75000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619867546",
    "nama": "RINSO BBK BARU 1000",
    "harga": 57000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619879778",
    "nama": "LADAKU",
    "harga": 460000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619923181",
    "nama": "KATING IRISAN BAWANG PUTIH",
    "harga": 364000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619949689",
    "nama": "GULA GMP",
    "harga": 845000,
    "modal": 0,
    "kategori": "cat_1787618049502",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619967643",
    "nama": "TERIGU LM",
    "harga": 183000,
    "modal": 0,
    "kategori": "cat_1787618049502",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787619995099",
    "nama": "MINYAK SAYUR CURAH",
    "harga": 300000,
    "modal": 0,
    "kategori": "cat_1787618059762",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787620022568",
    "nama": "HYDRO COCO",
    "harga": 140000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787620040033",
    "nama": "ORANGE WATER",
    "harga": 145000,
    "modal": 0,
    "kategori": "cat_1787618041838",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1787620057955",
    "nama": "SODIUM CANGKIR",
    "harga": 43000,
    "modal": 0,
    "kategori": "cat_1787618036138",
    "desc": "",
    "stok": null
  },
  {
    "id": "c_1788287968597",
    "menuId": "KB-9012",
    "nama": "KERBAU",
    "harga": 140000,
    "modal": 100000,
    "kategori": "cat_1787618024611",
    "desc": "",
    "stok": null
  }
];

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'edc'];

// ============================================
// JSON STORAGE PATHS
// ============================================
const APPDATA_DIR = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'kasir-warung', 'data');
const DB_PATH = path.join(APPDATA_DIR, 'kasir.db');
const TRANSACTION_PATH = path.join(APPDATA_DIR, 'transactions.json');
const LEGACY_TRANSACTION_PATH = path.join(APPDATA_DIR, 'transaction.json');
const SHIFT_PATH = path.join(APPDATA_DIR, 'shifts.json');

function ensureJsonDir() {
  fs.mkdirSync(APPDATA_DIR, { recursive: true });
}

function ensureSqliteDatabase() {
  ensureJsonDir();
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_trx_created ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_shifts_created ON shifts(created_at);
  `);
  db.close();
}

function readJson(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    console.warn(`⚠️ Gagal membaca ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureJsonDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function addTransactionsAndShifts(transactions) {
  const current = readJson(TRANSACTION_PATH, []);
  const next = [...transactions, ...current];
  writeJson(TRANSACTION_PATH, next);
  writeJson(LEGACY_TRANSACTION_PATH, next);

  const currentShifts = readJson(SHIFT_PATH, []);
  const shiftMap = new Map(currentShifts.map(shift => [String(shift.id), shift]));

  for (const trx of transactions) {
    if (!trx.shiftId) continue;
    const id = String(trx.shiftId);
    const existing = shiftMap.get(id);
    const entry = existing || {
      id,
      shiftNum: trx.shiftNum || 1,
      operator: trx.kasir || 'StressTest',
      status: 'closed',
      total: 0,
      count: 0,
      openedAt: trx.timestamp,
      closedAt: trx.timestamp,
    };

    entry.total = Number(entry.total || 0) + Number(trx.total || 0);
    entry.count = Number(entry.count || 0) + 1;
    entry.closedAt = trx.timestamp;
    entry.updatedAt = trx.timestamp;
    shiftMap.set(id, entry);
  }

  writeJson(SHIFT_PATH, Array.from(shiftMap.values()));

  ensureSqliteDatabase();
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  const insertTrx = db.prepare('INSERT OR REPLACE INTO transactions (id, data, created_at) VALUES (?, ?, ?)');
  const insertShift = db.prepare('INSERT OR REPLACE INTO shifts (id, data, created_at) VALUES (?, ?, ?)');

  const trxTx = db.transaction((items) => {
    for (const trx of items) {
      insertTrx.run(trx.id, JSON.stringify(trx), trx.timestamp || new Date().toISOString());
    }
  });
  const shiftTx = db.transaction((items) => {
    for (const shift of items) {
      insertShift.run(String(shift.id), JSON.stringify(shift), shift.closedAt || shift.updatedAt || shift.startTime || new Date().toISOString());
    }
  });

  trxTx(transactions);
  shiftTx(Array.from(shiftMap.values()));
  db.close();
}

console.log('📁 JSON data directory:', APPDATA_DIR);
console.log('📄 Database file:', DB_PATH);
console.log('📄 Transactions file:', TRANSACTION_PATH);
console.log('📄 Legacy transactions file:', LEGACY_TRANSACTION_PATH);
console.log('📄 Shifts file:', SHIFT_PATH);
console.log('📋 Menu items:', MENU_ITEMS.length);

ensureJsonDir();

// ============================================
// HELPER FUNCTIONS
// ============================================
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateTransaction(index) {
  // Random date within last 90 days
  const daysAgo = randomInt(0, 89);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59));
  
  // Random items (1-6 items per transaction)
  const items = [];
  let subtotal = 0;
  const itemCount = randomInt(3, 7);
  
  for (let i = 0; i < itemCount; i++) {
    const menu = randomItem(MENU_ITEMS);
    const qty = randomInt(1, 3);
    const lineTotal = menu.harga * qty;
    subtotal += lineTotal;
    items.push({ 
      id: menu.id, 
      nama: menu.nama, 
      harga: menu.harga, 
      qty, 
      subtotal: lineTotal, 
      kategori: menu.kategori, 
      catatan: 'Stress test item' 
    });
  }
  
  // Discount 0-10%
  const discount = 0; //Math.round(subtotal * randomInt(0, 10) / 100);
  // Tax 11%
  const tax = 0; //Math.round((subtotal - discount) * 0.11);
  const total = subtotal - discount + tax;
  
  const method = randomItem(PAYMENT_METHODS);
  const paid = total + randomInt(0, 50000);
  
  // Generate TRX ID: TRX-ddmmyyNNNN
  const d = date;
  const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
  const trxId = `TRX-${dateStr}${String(index).padStart(4,'0')}`;
  
  // Shift (70% chance)
  let shiftId = null, shiftNum = null;
  if (Math.random() > 0.3) {
    shiftNum = randomInt(1, 3);
    shiftId = `shift-${shiftNum}`;
  }
  
  return {
    id: trxId,
    timestamp: date.toISOString(),
    items,
    subtotal,
    discount,
    tax,
    total,
    paid,
    change: paid - total,
    paymentMethod: method,
    pax: randomInt(1, 6),
    shiftId,
    shiftNum,
    kasir: 'StressTest',
    catatan: 'Stress test data',
    createdAt: date.toISOString()
  };
}

// ============================================
// MAIN
// ============================================
async function main() {
  const TOTAL = 1000;
  const BATCH_SIZE = 500;

  console.log(`\n🚀 Starting JSON stress test: ${TOTAL.toLocaleString()} transactions`);
  console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);

  const startTime = Date.now();
  let inserted = 0;
  const batches = Math.ceil(TOTAL / BATCH_SIZE);

  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL);
    const batchCount = batchEnd - batchStart;

    const transactions = [];
    for (let i = batchStart; i < batchEnd; i++) {
      transactions.push(generateTransaction(i + 1));
    }

    addTransactionsAndShifts(transactions);
    inserted += batchCount;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? (inserted / elapsed).toFixed(1) : '0.0';
    const remaining = TOTAL - inserted;
    const eta = remaining > 0 && Number(rate) > 0 ? (remaining / Number(rate)).toFixed(0) : 0;

    console.log(`📦 Batch ${batch + 1}/${batches} | ${inserted.toLocaleString()}/${TOTAL.toLocaleString()} | ${rate} tx/s | ETA: ${eta}s`);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n✅ COMPLETE!`);
  console.log(`   Inserted: ${inserted.toLocaleString()}`);
  console.log(`   Time: ${totalTime.toFixed(1)}s`);
  console.log(`   Rate: ${(inserted / totalTime).toFixed(1)} tx/s`);

  const finalTransactions = readJson(TRANSACTION_PATH, []);
  console.log(`\n🔍 Verification: ${finalTransactions.length.toLocaleString()} transactions saved to ${TRANSACTION_PATH}`);
  console.log(`🔍 Shifts saved: ${readJson(SHIFT_PATH, []).length.toLocaleString()} shift entries`);

  const sample = finalTransactions.slice(0, 3);
  console.log('\n📄 Sample transactions:');
  sample.forEach(t => {
    console.log(`   ${t.id} | ${t.items.length} items | Rp${Number(t.total || 0).toLocaleString()} | ${t.paymentMethod} | ${new Date(t.timestamp).toLocaleString()}`);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});