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
  {id:"s1", nama:"Americano",               harga:40000,kategori:"kopi"},
  {id:"s2", nama:"Doppio",                  harga:42000,kategori:"kopi"},
  {id:"s3", nama:"Caffe Latte",             harga:50000,kategori:"kopi"},
  {id:"s4", nama:"Cappucino",               harga:50000,kategori:"kopi"},
  {id:"s5", nama:"Moccacino",               harga:45000,kategori:"kopi"},
  {id:"s6", nama:"Thai Coffee",             harga:45000,kategori:"kopi"},
  {id:"s7", nama:"Kopi Susu Gula Aren",     harga:50000,kategori:"kopi"},
  {id:"s8", nama:"Kopi Susu",               harga:45000,kategori:"kopi"},
  {id:"s9", nama:"Kopi Tarik",              harga:47000,kategori:"kopi"},
  {id:"s10",nama:"Affogato",                harga:55000,kategori:"kopi"},
  {id:"s11",nama:"House Tea",               harga:22000,kategori:"teh"},
  {id:"s12",nama:"Lemon Tea",               harga:40000,kategori:"teh"},
  {id:"s13",nama:"Lychee Tea",              harga:50000,kategori:"teh"},
  {id:"s14",nama:"Teh Tarik",               harga:45000,kategori:"teh"},
  {id:"s15",nama:"Thai Tea",                harga:45000,kategori:"teh"},
  {id:"s16",nama:"Ice Chocolate",           harga:55000,kategori:"non-kopi"},
  {id:"s17",nama:"Coca Cola Float",         harga:50000,kategori:"non-kopi"},
  {id:"s18",nama:"Coca Cola/Fanta/Sprite",  harga:30000,kategori:"non-kopi"},
  {id:"s19",nama:"Es Jeruk",                harga:40000,kategori:"non-kopi"},
  {id:"s20",nama:"Mineral Water",           harga:22000,kategori:"non-kopi"},
  {id:"s21",nama:"Wedang Uwuh",             harga:45000,kategori:"non-kopi"},
  {id:"s22",nama:"Wedang Sereh",            harga:40000,kategori:"non-kopi"},
  {id:"s23",nama:"Es Cincau",               harga:40000,kategori:"non-kopi"},
  {id:"s24",nama:"Es Lidah Buaya",          harga:42000,kategori:"non-kopi"},
  {id:"s25",nama:"Soda Gembira",            harga:50000,kategori:"non-kopi"},
  {id:"s26",nama:"Jus Semangka",            harga:40000,kategori:"non-kopi"},
  {id:"s27",nama:"Jus Melon",               harga:40000,kategori:"non-kopi"},
  {id:"s28",nama:"Bintang",                 harga:70000,kategori:"non-kopi"},
  {id:"s29",nama:"Bintang Redler Lemon",    harga:75000,kategori:"non-kopi"},
  {id:"s30",nama:"One Scoop Ice Cream",     harga:40000,kategori:"non-kopi"},
  {id:"s31",nama:"Double Scoop Ice Cream",  harga:60000,kategori:"non-kopi"},
  {id:"s32",nama:"Roti Kesukaan Pak Yan",   harga:90000,kategori:"sandwich"},
  {id:"s33",nama:"Black Toast with Kaya",   harga:45000,kategori:"sandwich"},
  {id:"s34",nama:"Black Toast with Butter", harga:47000,kategori:"sandwich"},
  {id:"s35",nama:"Black Toast Kaya Butter", harga:50000,kategori:"sandwich"},
  {id:"s36",nama:"Roti Bakar Srikaya",      harga:58000,kategori:"sandwich"},
  {id:"s37",nama:"Roti Bakar Peanut Butter",harga:63000,kategori:"sandwich"},
  {id:"s38",nama:"Roti Bakar Chesee Chruncy",harga:65000,kategori:"sandwich"},
  {id:"s39",nama:"Roti Bakar Choco Spread", harga:58000,kategori:"sandwich"},
  {id:"s40",nama:"Roti Bakar Choco Chruncy",harga:63000,kategori:"sandwich"},
  {id:"s41",nama:"Beef Sandwich YKK",       harga:69000,kategori:"sandwich"},
  {id:"s42",nama:"Indomie Goreng Original", harga:30000,kategori:"indomie"},
  {id:"s43",nama:"Indomie Rebus Kari Ayam", harga:32000,kategori:"indomie"},
  {id:"s44",nama:"Add On Telor",            harga:15000,kategori:"indomie"},
  {id:"s45",nama:"Add On Nasi",             harga:15000,kategori:"indomie"},
  {id:"s46",nama:"French Fries",            harga:65000,kategori:"snack"},
  {id:"s47",nama:"Chicken Wings Original",  harga:53000,kategori:"snack"},
  {id:"s48",nama:"Chicken Wings BBQ Sauce", harga:53000,kategori:"snack"},
  {id:"s49",nama:"Chicken Wings Baputjabe", harga:55000,kategori:"snack"},
  {id:"s50",nama:"Singkong Goreng Sambal",  harga:40000,kategori:"snack"},
  {id:"s51",nama:"Singkong Goreng Keju",    harga:45000,kategori:"snack"},
  {id:"s52",nama:"Pisang Goreng Nona Manis",harga:40000,kategori:"snack"},
  {id:"s53",nama:"Cireng",                  harga:40000,kategori:"snack"},
  {id:"s54",nama:"Bakmi Goreng",            harga:55000,kategori:"main-course"},
  {id:"s55",nama:"Nasi Goreng Coklat",      harga:55000,kategori:"main-course"},
  {id:"s56",nama:"Nasi Goreng Pak Yan",     harga:55000,kategori:"main-course"},
  {id:"s57",nama:"Bakmi Godog",             harga:45000,kategori:"main-course"},
  {id:"s58",nama:"Nasi Soto Ayam",          harga:55000,kategori:"main-course"},
  {id:"s59",nama:"Nasi Ayam Goreng Basah",  harga:45000,kategori:"main-course"},
  {id:"s60",nama:"Nasi Ayam Goreng Serundeng",harga:50000,kategori:"main-course"},
  {id:"s61",nama:"Nasi Ayam Goreng Lengkuas",harga:50000,kategori:"main-course"},
  {id:"s62",nama:"Nasi Ayam Bumbu Bali",    harga:45000,kategori:"main-course"},
  {id:"s63",nama:"Lele",                    harga:35000,kategori:"main-course"},
  {id:"s64",nama:"Mie Nyemek",              harga:50000,kategori:"main-course"},
  {id:"s65",nama:"Mie Ayam",                harga:45000,kategori:"main-course"},
  {id:"s66",nama:"Nasi Kare Daging",        harga:55000,kategori:"main-course"},
  {id:"s67",nama:"Nasi Garlic Butter",      harga:55000,kategori:"main-course"},
  {id:"s68",nama:"Srikaya 1/2 Loaf",        harga:38000,kategori:"sandwich"},
  {id:"s69",nama:"Peanut Butter 1/2 Loaf",  harga:43000,kategori:"sandwich"},
];

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'edc'];

// ============================================
// DATABASE PATH
// ============================================
const DB_PATH = path.join(process.env.APPDATA, 'kasir-warung', 'data', 'kasir.db');

console.log('📁 Database:', DB_PATH);
console.log('📋 Menu items:', MENU_ITEMS.length);

// Check database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at:', DB_PATH);
  console.log('💡 Make sure you\'ve run the Electron app at least once');
  process.exit(1);
}

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
  const itemCount = randomInt(1, 6);
  
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
      catatan: '' 
    });
  }
  
  // Discount 0-10%
  const discount = Math.round(subtotal * randomInt(0, 10) / 100);
  // Tax 11%
  const tax = Math.round((subtotal - discount) * 0.11);
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
    meja: randomInt(1, 20),
    catatan: 'Stress test data',
    createdAt: date.toISOString()
  };
}

// ============================================
// MAIN
// ============================================
async function main() {
  const TOTAL = 100000;
  const BATCH_SIZE = 5000;
  
  console.log(`\n🚀 Starting stress test: ${TOTAL.toLocaleString()} transactions`);
  console.log(`📦 Batch size: ${BATCH_SIZE.toLocaleString()}`);
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -32768'); // 32MB cache
  
  // Prepare insert statement
  const insertStmt = db.prepare('INSERT INTO transactions (id, data) VALUES (?, ?)');
  
  // Batch insert transaction
  const insertBatch = db.transaction((transactions) => {
    for (const trx of transactions) {
      insertStmt.run(trx.id, JSON.stringify(trx));
    }
  });
  
  const startTime = Date.now();
  let inserted = 0;
  const batches = Math.ceil(TOTAL / BATCH_SIZE);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL);
    const batchCount = batchEnd - batchStart;
    
    // Generate batch
    const transactions = [];
    for (let i = batchStart; i < batchEnd; i++) {
      transactions.push(generateTransaction(i + 1));
    }
    
    // Insert batch
    insertBatch(transactions);
    inserted += batchCount;
    
    // Progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (inserted / elapsed).toFixed(1);
    const remaining = TOTAL - inserted;
    const eta = remaining > 0 ? (remaining / rate).toFixed(0) : 0;
    
    console.log(`📦 Batch ${batch + 1}/${batches} | ${inserted.toLocaleString()}/${TOTAL.toLocaleString()} | ${rate} tx/s | ETA: ${eta}s`);
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n✅ COMPLETE!`);
  console.log(`   Inserted: ${inserted.toLocaleString()}`);
  console.log(`   Time: ${totalTime.toFixed(1)}s`);
  console.log(`   Rate: ${(inserted / totalTime).toFixed(1)} tx/s`);
  
  // Verify
  const count = db.prepare('SELECT COUNT(*) as total FROM transactions').get();
  console.log(`\n🔍 Database verification: ${count.total.toLocaleString()} transactions total`);
  
  // Show sample
  const sample = db.prepare('SELECT id, data FROM transactions ORDER BY created_at DESC LIMIT 3').all();
  console.log('\n📄 Sample transactions:');
  sample.forEach(row => {
    const t = JSON.parse(row.data);
    console.log(`   ${t.id} | ${t.items.length} items | Rp${t.total.toLocaleString()} | ${t.paymentMethod} | ${new Date(t.timestamp).toLocaleString()}`);
  });
  
  // Date range
  const range = db.prepare(`
    SELECT 
      MIN(date(created_at)) as earliest,
      MAX(date(created_at)) as latest
    FROM transactions
  `).get();
  console.log(`\n📅 Date range: ${range.earliest} to ${range.latest}`);
  
  // Payment method breakdown
  const payments = db.prepare(`
    SELECT 
      json_extract(data, '$.paymentMethod') as method,
      COUNT(*) as count
    FROM transactions
    GROUP BY json_extract(data, '$.paymentMethod')
    ORDER BY count DESC
  `).all();
  console.log('\n💳 Payment methods:');
  payments.forEach(p => console.log(`   ${p.method}: ${p.count.toLocaleString()}`));
  
  db.close();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});