// ============================================
// QUICK STRESS TEST - Paste into Electron DevTools Console
// ============================================
// 1. Run: npm run electron:dev
// 2. Open DevTools (Ctrl+Shift+I)
// 3. Paste this entire script and press Enter
// ============================================

const MENU_ITEMS = [
  {id:"s1", nama:"Americano", harga:40000,kategori:"kopi"},
  {id:"s2", nama:"Doppio", harga:42000,kategori:"kopi"},
  {id:"s3", nama:"Caffe Latte", harga:50000,kategori:"kopi"},
  {id:"s4", nama:"Cappucino", harga:50000,kategori:"kopi"},
  {id:"s5", nama:"Moccacino", harga:45000,kategori:"kopi"},
  {id:"s6", nama:"Thai Coffee", harga:45000,kategori:"kopi"},
  {id:"s7", nama:"Kopi Susu Gula Aren", harga:50000,kategori:"kopi"},
  {id:"s8", nama:"Kopi Susu", harga:45000,kategori:"kopi"},
  {id:"s9", nama:"Kopi Tarik", harga:47000,kategori:"kopi"},
  {id:"s10",nama:"Affogato", harga:55000,kategori:"kopi"},
  {id:"s11",nama:"House Tea", harga:22000,kategori:"teh"},
  {id:"s12",nama:"Lemon Tea", harga:40000,kategori:"teh"},
  {id:"s13",nama:"Lychee Tea", harga:50000,kategori:"teh"},
  {id:"s14",nama:"Teh Tarik", harga:45000,kategori:"teh"},
  {id:"s15",nama:"Thai Tea", harga:45000,kategori:"teh"},
  {id:"s16",nama:"Ice Chocolate", harga:55000,kategori:"non-kopi"},
  {id:"s17",nama:"Coca Cola Float", harga:50000,kategori:"non-kopi"},
  {id:"s18",nama:"Coca Cola/Fanta/Sprite", harga:30000,kategori:"non-kopi"},
  {id:"s19",nama:"Es Jeruk", harga:40000,kategori:"non-kopi"},
  {id:"s20",nama:"Mineral Water", harga:22000,kategori:"non-kopi"},
  {id:"s21",nama:"Wedang Uwuh", harga:45000,kategori:"non-kopi"},
  {id:"s22",nama:"Wedang Sereh", harga:40000,kategori:"non-kopi"},
  {id:"s23",nama:"Es Cincau", harga:40000,kategori:"non-kopi"},
  {id:"s24",nama:"Es Lidah Buaya", harga:42000,kategori:"non-kopi"},
  {id:"s25",nama:"Soda Gembira", harga:50000,kategori:"non-kopi"},
  {id:"s26",nama:"Jus Semangka", harga:40000,kategori:"non-kopi"},
  {id:"s27",nama:"Jus Melon", harga:40000,kategori:"non-kopi"},
  {id:"s28",nama:"Bintang", harga:70000,kategori:"non-kopi"},
  {id:"s29",nama:"Bintang Redler Lemon", harga:75000,kategori:"non-kopi"},
  {id:"s30",nama:"One Scoop Ice Cream", harga:40000,kategori:"non-kopi"},
  {id:"s31",nama:"Double Scoop Ice Cream", harga:60000,kategori:"non-kopi"},
  {id:"s32",nama:"Roti Kesukaan Pak Yan", harga:90000,kategori:"sandwich"},
  {id:"s33",nama:"Black Toast with Kaya", harga:45000,kategori:"sandwich"},
  {id:"s34",nama:"Black Toast with Butter", harga:47000,kategori:"sandwich"},
  {id:"s35",nama:"Black Toast Kaya Butter", harga:50000,kategori:"sandwich"},
  {id:"s36",nama:"Roti Bakar Srikaya", harga:58000,kategori:"sandwich"},
  {id:"s37",nama:"Roti Bakar Peanut Butter", harga:63000,kategori:"sandwich"},
  {id:"s38",nama:"Roti Bakar Chesee Chruncy", harga:65000,kategori:"sandwich"},
  {id:"s39",nama:"Roti Bakar Choco Spread", harga:58000,kategori:"sandwich"},
  {id:"s40",nama:"Roti Bakar Choco Chruncy", harga:63000,kategori:"sandwich"},
  {id:"s41",nama:"Beef Sandwich YKK", harga:69000,kategori:"sandwich"},
  {id:"s42",nama:"Indomie Goreng Original", harga:30000,kategori:"indomie"},
  {id:"s43",nama:"Indomie Rebus Kari Ayam", harga:32000,kategori:"indomie"},
  {id:"s44",nama:"Add On Telor", harga:15000,kategori:"indomie"},
  {id:"s45",nama:"Add On Nasi", harga:15000,kategori:"indomie"},
  {id:"s46",nama:"French Fries", harga:65000,kategori:"snack"},
  {id:"s47",nama:"Chicken Wings Original", harga:53000,kategori:"snack"},
  {id:"s48",nama:"Chicken Wings BBQ Sauce", harga:53000,kategori:"snack"},
  {id:"s49",nama:"Chicken Wings Baputjabe", harga:55000,kategori:"snack"},
  {id:"s50",nama:"Singkong Goreng Sambal", harga:40000,kategori:"snack"},
  {id:"s51",nama:"Singkong Goreng Keju", harga:45000,kategori:"snack"},
  {id:"s52",nama:"Pisang Goreng Nona Manis", harga:40000,kategori:"snack"},
  {id:"s53",nama:"Cireng", harga:40000,kategori:"snack"},
  {id:"s54",nama:"Bakmi Goreng", harga:55000,kategori:"main-course"},
  {id:"s55",nama:"Nasi Goreng Coklat", harga:55000,kategori:"main-course"},
  {id:"s56",nama:"Nasi Goreng Pak Yan", harga:55000,kategori:"main-course"},
  {id:"s57",nama:"Bakmi Godog", harga:45000,kategori:"main-course"},
  {id:"s58",nama:"Nasi Soto Ayam", harga:55000,kategori:"main-course"},
  {id:"s59",nama:"Nasi Ayam Goreng Basah", harga:45000,kategori:"main-course"},
  {id:"s60",nama:"Nasi Ayam Goreng Serundeng", harga:50000,kategori:"main-course"},
  {id:"s61",nama:"Nasi Ayam Goreng Lengkuas", harga:50000,kategori:"main-course"},
  {id:"s62",nama:"Nasi Ayam Bumbu Bali", harga:45000,kategori:"main-course"},
  {id:"s63",nama:"Lele", harga:35000,kategori:"main-course"},
  {id:"s64",nama:"Mie Nyemek", harga:50000,kategori:"main-course"},
  {id:"s65",nama:"Mie Ayam", harga:45000,kategori:"main-course"},
  {id:"s66",nama:"Nasi Kare Daging", harga:55000,kategori:"main-course"},
  {id:"s67",nama:"Nasi Garlic Butter", harga:55000,kategori:"main-course"},
  {id:"s68",nama:"Srikaya 1/2 Loaf", harga:38000,kategori:"sandwich"},
  {id:"s69",nama:"Peanut Butter 1/2 Loaf", harga:43000,kategori:"sandwich"},
];

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'edc'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genTrx(index) {
  const daysAgo = randomInt(0, 89);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59));
  
  const items = [];
  let subtotal = 0;
  const itemCount = randomInt(1, 6);
  
  for (let i = 0; i < itemCount; i++) {
    const m = randomItem(MENU_ITEMS);
    const qty = randomInt(1, 3);
    const lineTotal = m.harga * qty;
    subtotal += lineTotal;
    items.push({ id: m.id, nama: m.nama, harga: m.harga, qty, subtotal: lineTotal, kategori: m.kategori, catatan: '' });
  }
  
  const discount = Math.round(subtotal * randomInt(0, 10) / 100);
  const tax = Math.round((subtotal - discount) * 0.11);
  const total = subtotal - discount + tax;
  const method = randomItem(PAYMENT_METHODS);
  const paid = total + randomInt(0, 50000);
  
  const d = date;
  const dateStr = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
  const trxId = `TRX-${dateStr}${String(index).padStart(4,'0')}`;
  
  return {
    id: trxId, timestamp: date.toISOString(), items,
    subtotal, discount, tax, total,
    paid, change: paid - total, paymentMethod: method,
    pax: randomInt(1, 6),
    shiftId: Math.random() > 0.3 ? `shift-${randomInt(1,3)}` : null,
    shiftNum: Math.random() > 0.3 ? randomInt(1,3) : null,
    kasir: 'StressTest', meja: randomInt(1, 20), catatan: 'Stress test data'
  };
}

// ============ RUN ============
(async () => {
  if (!window.kasirAPI) { console.error('❌ Run in Electron DevTools Console'); return; }
  
  const TOTAL = 100000;
  const BATCH = 500;
  let ok = 0, err = 0;
  const t0 = Date.now();
  
  console.log(`🚀 Generating ${TOTAL} transactions...`);
  
  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    const txns = Array.from({ length: BATCH }, (_, i) => genTrx(batch * BATCH + i + 1));
    
    for (const t of txns) {
      try {
        const r = await window.kasirAPI.processPayment({ trx: t, updatedMenu: null, activeBillId: null });
        r.ok ? ok++ : err++;
      } catch { err++; }
    }
    
    if (batch % 20 === 0) {
      const s = (Date.now() - t0) / 1000;
      console.log(`📦 ${ok}/${TOTAL} | ${(ok/s).toFixed(1)} tx/s | ${((TOTAL-ok)/(ok/s)).toFixed(0)}s left`);
    }
  }
  
  const sec = (Date.now() - t0) / 1000;
  console.log(`\n✅ DONE: ${ok} ok, ${err} errors in ${sec.toFixed(1)}s (${(ok/sec).toFixed(1)} tx/s)`);
  
  // Verify
  const v = await window.kasirAPI.loadTrxFiltered({ page: 0, pageSize: 1 });
  console.log(`🔍 DB confirms: ${v.total} transactions`);
})();