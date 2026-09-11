/**
 * Stress Test Script - Generates 100,000 transactions using existing menu items
 * Run this in the Electron app console or as a standalone script
 * 
 * Usage in Electron DevTools Console:
 * 1. Open the app with `npm run electron:dev`
 * 2. Open DevTools (Ctrl+Shift+I)
 * 3. Copy-paste this entire script into the Console and press Enter
 * 
 * Or run as standalone with Node (requires better-sqlite3):
 * node stress-test.js
 */

const SEED = [
  {id:"s1", nama:"Americano",               harga:40000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s2", nama:"Doppio",                  harga:42000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s3", nama:"Caffe Latte",             harga:50000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s4", nama:"Cappucino",               harga:50000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s5", nama:"Moccacino",               harga:45000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s6", nama:"Thai Coffee",             harga:45000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s7", nama:"Kopi Susu Gula Aren",     harga:50000,kategori:"kopi",        desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s8", nama:"Kopi Susu",               harga:45000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s9", nama:"Kopi Tarik",              harga:47000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s10",nama:"Affogato",                harga:55000,kategori:"kopi",        desc:"",                               foto:null,stok:null,modal:0},
  {id:"s11",nama:"House Tea",               harga:22000,kategori:"teh",         desc:"",                               foto:null,stok:null,modal:0},
  {id:"s12",nama:"Lemon Tea",               harga:40000,kategori:"teh",         desc:"",                               foto:null,stok:null,modal:0},
  {id:"s13",nama:"Lychee Tea",              harga:50000,kategori:"teh",         desc:"",                               foto:null,stok:null,modal:0},
  {id:"s14",nama:"Teh Tarik",               harga:45000,kategori:"teh",         desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s15",nama:"Thai Tea",                harga:45000,kategori:"teh",         desc:"",                               foto:null,stok:null,modal:0},
  {id:"s16",nama:"Ice Chocolate",           harga:55000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s17",nama:"Coca Cola Float",         harga:50000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s18",nama:"Coca Cola/Fanta/Sprite",  harga:30000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s19",nama:"Es Jeruk",                harga:40000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s20",nama:"Mineral Water",           harga:22000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s21",nama:"Wedang Uwuh",             harga:45000,kategori:"non-kopi",    desc:"Traditional",                    foto:null,stok:null,modal:0},
  {id:"s22",nama:"Wedang Sereh",            harga:40000,kategori:"non-kopi",    desc:"Traditional",                    foto:null,stok:null,modal:0},
  {id:"s23",nama:"Es Cincau",               harga:40000,kategori:"non-kopi",    desc:"Traditional",                    foto:null,stok:null,modal:0},
  {id:"s24",nama:"Es Lidah Buaya",          harga:42000,kategori:"non-kopi",    desc:"Traditional",                    foto:null,stok:null,modal:0},
  {id:"s25",nama:"Soda Gembira",            harga:50000,kategori:"non-kopi",    desc:"Traditional",                    foto:null,stok:null,modal:0},
  {id:"s26",nama:"Jus Semangka",            harga:40000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s27",nama:"Jus Melon",               harga:40000,kategori:"non-kopi",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s28",nama:"Bintang",                 harga:70000,kategori:"non-kopi",    desc:"Beer",                           foto:null,stok:null,modal:0},
  {id:"s29",nama:"Bintang Redler Lemon",    harga:75000,kategori:"non-kopi",    desc:"Beer",                           foto:null,stok:null,modal:0},
  {id:"s30",nama:"One Scoop Ice Cream",     harga:40000,kategori:"non-kopi",    desc:"Ice Cream",                      foto:null,stok:null,modal:0},
  {id:"s31",nama:"Double Scoop Ice Cream",  harga:60000,kategori:"non-kopi",    desc:"Ice Cream",                      foto:null,stok:null,modal:0},
  {id:"s32",nama:"Roti Kesukaan Pak Yan",   harga:90000,kategori:"sandwich",    desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s33",nama:"Black Toast with Kaya",   harga:45000,kategori:"sandwich",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s34",nama:"Black Toast with Butter", harga:47000,kategori:"sandwich",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s35",nama:"Black Toast Kaya Butter", harga:50000,kategori:"sandwich",    desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s36",nama:"Roti Bakar Srikaya",      harga:58000,kategori:"sandwich",    desc:"1 Loaf",                         foto:null,stok:null,modal:0},
  {id:"s37",nama:"Roti Bakar Peanut Butter",harga:63000,kategori:"sandwich",    desc:"1 Loaf",                         foto:null,stok:null,modal:0},
  {id:"s38",nama:"Roti Bakar Chesee Chruncy",harga:65000,kategori:"sandwich",   desc:"1 Loaf · Bestseller",            foto:null,stok:null,modal:0},
  {id:"s39",nama:"Roti Bakar Choco Spread", harga:58000,kategori:"sandwich",    desc:"1 Loaf",                         foto:null,stok:null,modal:0},
  {id:"s40",nama:"Roti Bakar Choco Chruncy",harga:63000,kategori:"sandwich",    desc:"1 Loaf · Bestseller",            foto:null,stok:null,modal:0},
  {id:"s41",nama:"Beef Sandwich YKK",       harga:69000,kategori:"sandwich",    desc:"Menu Terbaru",                   foto:null,stok:null,modal:0},
  {id:"s42",nama:"Indomie Goreng Original", harga:30000,kategori:"indomie",     desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s43",nama:"Indomie Rebus Kari Ayam", harga:32000,kategori:"indomie",     desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s44",nama:"Add On Telor",            harga:15000,kategori:"indomie",     desc:"Tambahan",                       foto:null,stok:null,modal:0},
  {id:"s45",nama:"Add On Nasi",             harga:15000,kategori:"indomie",     desc:"Tambahan",                       foto:null,stok:null,modal:0},
  {id:"s46",nama:"French Fries",            harga:65000,kategori:"snack",       desc:"Seaweed/Balado/BBQ · Bestseller",foto:null,stok:null,modal:0},
  {id:"s47",nama:"Chicken Wings Original",  harga:53000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s48",nama:"Chicken Wings BBQ Sauce", harga:53000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s49",nama:"Chicken Wings Baputjabe", harga:55000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s50",nama:"Singkong Goreng Sambal",  harga:40000,kategori:"snack",       desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s51",nama:"Singkong Goreng Keju",    harga:45000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s52",nama:"Pisang Goreng Nona Manis",harga:40000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s53",nama:"Cireng",                  harga:40000,kategori:"snack",       desc:"",                               foto:null,stok:null,modal:0},
  {id:"s54",nama:"Bakmi Goreng",            harga:55000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s55",nama:"Nasi Goreng Coklat",      harga:55000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s56",nama:"Nasi Goreng Pak Yan",     harga:55000,kategori:"main-course", desc:"Bestseller",                     foto:null,stok:null,modal:0},
  {id:"s57",nama:"Bakmi Godog",             harga:45000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s58",nama:"Nasi Soto Ayam",          harga:55000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s59",nama:"Nasi Ayam Goreng Basah",  harga:45000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s60",nama:"Nasi Ayam Goreng Serundeng",harga:50000,kategori:"main-course",desc:"",                              foto:null,stok:null,modal:0},
  {id:"s61",nama:"Nasi Ayam Goreng Lengkuas",harga:50000,kategori:"main-course",desc:"",                               foto:null,stok:null,modal:0},
  {id:"s62",nama:"Nasi Ayam Bumbu Bali",    harga:45000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s63",nama:"Lele",                    harga:35000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s64",nama:"Mie Nyemek",              harga:50000,kategori:"main-course", desc:"",                               foto:null,stok:null,modal:0},
  {id:"s65",nama:"Mie Ayam",                harga:45000,kategori:"main-course", desc:"Menu Terbaru",                   foto:null,stok:null,modal:0},
  {id:"s66",nama:"Nasi Kare Daging",        harga:55000,kategori:"main-course", desc:"Menu Terbaru",                   foto:null,stok:null,modal:0},
  {id:"s67",nama:"Nasi Garlic Butter",      harga:55000,kategori:"main-course", desc:"Menu Terbaru",                   foto:null,stok:null,modal:0},
  {id:"s68",nama:"Srikaya 1/2 Loaf",        harga:38000,kategori:"sandwich",    desc:"",                               foto:null,stok:null,modal:0},
  {id:"s69",nama:"Peanut Butter 1/2 Loaf",  harga:43000,kategori:"sandwich",    desc:"",                               foto:null,stok:null,modal:0},
];

// Payment methods
const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'edc'];

// Generate random transaction
function generateTransaction(index, baseDate = new Date()) {
  // Random date within last 90 days
  const daysOffset = Math.floor(Math.random() * 90);
  const hoursOffset = Math.floor(Math.random() * 24);
  const minutesOffset = Math.floor(Math.random() * 60);
  
  const txDate = new Date(baseDate);
  txDate.setDate(txDate.getDate() - daysOffset);
  txDate.setHours(txDate.getHours() - hoursOffset);
  txDate.setMinutes(txDate.getMinutes() - minutesOffset);
  
  // Random number of items (1-8 items per transaction)
  const itemCount = Math.floor(Math.random() * 8) + 1;
  const items = [];
  let subtotal = 0;
  
  for (let i = 0; i < itemCount; i++) {
    const menuItem = SEED[Math.floor(Math.random() * SEED.length)];
    const qty = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
    const itemTotal = menuItem.harga * qty;
    subtotal += itemTotal;
    
    items.push({
      id: menuItem.id,
      nama: menuItem.nama,
      harga: menuItem.harga,
      qty: qty,
      subtotal: itemTotal,
      kategori: menuItem.kategori,
      catatan: ''
    });
  }
  
  // Random discount (0-10%)
  const discountPercent = Math.floor(Math.random() * 11);
  const discount = Math.round(subtotal * discountPercent / 100);
  
  // Tax 11%
  const tax = Math.round((subtotal - discount) * 0.11);
  
  // Total
  const total = subtotal - discount + tax;
  
  // Payment
  const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const paid = total + Math.floor(Math.random() * 50000); // Sometimes overpay
  const change = paid - total;
  
  // Pax (1-6)
  const pax = Math.floor(Math.random() * 6) + 1;
  
  // Shift (optional)
  const shifts = ['shift-1', 'shift-2', 'shift-3'];
  const shiftId = Math.random() > 0.3 ? shifts[Math.floor(Math.random() * shifts.length)] : null;
  const shiftNum = shiftId ? parseInt(shiftId.split('-')[1]) : null;
  
  // Generate TRX ID
  const dateStr = `${String(txDate.getDate()).padStart(2, '0')}${String(txDate.getMonth() + 1).padStart(2, '0')}${String(txDate.getFullYear()).slice(-2)}`;
  const trxId = `TRX-${dateStr}${String(index).padStart(4, '0')}`;
  
  return {
    id: trxId,
    timestamp: txDate.toISOString(),
    items: items,
    subtotal: subtotal,
    discount: discount,
    tax: tax,
    total: total,
    paid: paid,
    change: change,
    paymentMethod: paymentMethod,
    pax: pax,
    shiftId: shiftId,
    shiftNum: shiftNum,
    kasir: 'Stress Test',
    meja: Math.floor(Math.random() * 20) + 1,
    catatan: 'Generated by stress test',
    createdAt: txDate.toISOString()
  };
}

// ============ RUN IN ELECTRON DEVTOOLS CONSOLE ============
// Copy everything below this line into the Electron DevTools Console

async function runStressTestInElectron() {
  console.log('🚀 Starting Stress Test - Generating 100,000 transactions...');
  console.log('📋 Using', SEED.length, 'menu items');
  
  const TOTAL_TRANSACTIONS = 100000;
  const BATCH_SIZE = 1000;
  const batches = Math.ceil(TOTAL_TRANSACTIONS / BATCH_SIZE);
  
  // Check if we're in Electron with kasirAPI
  const hasKasirAPI = typeof window !== 'undefined' && window.kasirAPI;
  
  if (!hasKasirAPI) {
    console.error('❌ Not running in Electron environment with kasirAPI');
    console.log('💡 Run this in Electron DevTools Console (Ctrl+Shift+I)');
    return;
  }
  
  console.log('✅ Electron kasirAPI detected');
  
  let successCount = 0;
  let errorCount = 0;
  const startTime = Date.now();
  
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_TRANSACTIONS);
    const batchTransactions = [];
    
    // Generate batch
    for (let i = batchStart; i < batchEnd; i++) {
      batchTransactions.push(generateTransaction(i + 1));
    }
    
    // Save batch using processPayment (atomic write)
    for (const trx of batchTransactions) {
      try {
        const result = await window.kasirAPI.processPayment({
          trx: trx,
          updatedMenu: null,
          activeBillId: null
        });
        
        if (result.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error('❌ Failed to save transaction:', trx.id, result.error);
        }
      } catch (err) {
        errorCount++;
        console.error('❌ Error saving transaction:', trx.id, err.message);
      }
    }
    
    // Progress
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (successCount / elapsed).toFixed(1);
    const eta = ((TOTAL_TRANSACTIONS - successCount) / rate).toFixed(0);
    
    console.log(`📦 Batch ${batch + 1}/${batches} | ${successCount}/${TOTAL_TRANSACTIONS} | ${rate} tx/s | ETA: ${eta}s`);
    
    // Small delay to prevent blocking UI
    await new Promise(r => setTimeout(r, 10));
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n✅ STRESS TEST COMPLETE!');
  console.log(`📊 Results:`);
  console.log(`   - Total: ${TOTAL_TRANSACTIONS}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Time: ${totalTime}s`);
  console.log(`   - Rate: ${(successCount / totalTime).toFixed(1)} tx/s`);
  
  // Verify count
  const verify = await window.kasirAPI.loadTrxFiltered({ page: 0, pageSize: 1 });
  console.log(`\n🔍 Verification: Database reports ${verify.total} transactions`);
  
  return { successCount, errorCount, totalTime };
}

// Auto-run if in Electron
if (typeof window !== 'undefined' && window.kasirAPI) {
  runStressTestInElectron();
}

// ============ STANDALONE NODE.JS VERSION ============
// Run with: node stress-test.js
// Requires: better-sqlite3 installed

if (typeof module !== 'undefined' && require.main === module) {
  const Database = require('better-sqlite3');
  const path = require('path');
  const fs = require('fs');
  
  const DATA_DIR = path.join(require('os').homedir(), 'AppData', 'Roaming', 'Kasir Warung', 'data');
  const DB_PATH = path.join(DATA_DIR, 'kasir.db');
  
  console.log('📁 Database path:', DB_PATH);
  console.log('📋 Menu items:', SEED.length);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found at:', DB_PATH);
    console.log('💡 Run the Electron app first to create the database');
    process.exit(1);
  }
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  const TOTAL_TRANSACTIONS = 100000;
  const BATCH_SIZE = 5000;
  
  const insertStmt = db.prepare('INSERT INTO transactions (id, data) VALUES (?, ?)');
  const insertMany = db.transaction((transactions) => {
    for (const trx of transactions) {
      insertStmt.run(trx.id, JSON.stringify(trx));
    }
  });
  
  console.log('🚀 Starting standalone stress test...');
  const startTime = Date.now();
  let successCount = 0;
  
  for (let batch = 0; batch < Math.ceil(TOTAL_TRANSACTIONS / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, TOTAL_TRANSACTIONS);
    const batchTransactions = [];
    
    for (let i = batchStart; i < batchEnd; i++) {
      batchTransactions.push(generateTransaction(i + 1));
    }
    
    insertMany(batchTransactions);
    successCount += batchTransactions.length;
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (successCount / elapsed).toFixed(1);
    console.log(`📦 Batch ${batch + 1} | ${successCount}/${TOTAL_TRANSACTIONS} | ${rate} tx/s`);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n✅ STRESS TEST COMPLETE!');
  console.log(`   - Total: ${successCount}`);
  console.log(`   - Time: ${totalTime}s`);
  console.log(`   - Rate: ${(successCount / totalTime).toFixed(1)} tx/s`);
  
  // Verify
  const count = db.prepare('SELECT COUNT(*) as total FROM transactions').get();
  console.log(`\n🔍 Verification: Database has ${count.total} transactions`);
  
  db.close();
}

module.exports = { SEED, generateTransaction, runStressTestInElectron };