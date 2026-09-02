(() => {
// ============================================
// QUICK STRESS TEST - Paste into Electron DevTools Console
// ============================================
// 1. Run: npm run electron:dev
// 2. Open DevTools (Ctrl+Shift+I)
// 3. Paste this entire script and press Enter
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

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genTrx(index, menuItems, runId) {
  const daysAgo = randomInt(0, 89);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(7, 22), randomInt(0, 59), randomInt(0, 59));
  
  const items = [];
  let subtotal = 0;
  const itemCount = randomInt(1, 6);
  
  for (let i = 0; i < itemCount; i++) {
    const m = randomItem(menuItems);
    const qty = randomInt(25, 60);
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
  const trxId = `STRESS-${runId}-${dateStr}-${String(index).padStart(4,'0')}`;
  
  return {
    id: trxId, timestamp: date.toISOString(), items,
    subtotal, pajak: tax, service: 0, total,
    bayar: paid, kembalian: paid - total,
    metodeBayar: method, metodeBayarLabel: method.toUpperCase(),
    shiftId: Math.random() > 0.3 ? `shift-${randomInt(1,3)}` : null,
    shiftNum: Math.random() > 0.3 ? randomInt(1,3) : null,
    kasir: 'StressTest', catatan: 'Stress test data'
  };
}

// ============ RUN ============
(async () => {
  if (!window.kasirAPI) { console.error('❌ Run in Electron DevTools Console'); return; }

  const savedMenu = await window.kasirAPI.loadMenu();
  const menuItems = Array.isArray(savedMenu) && savedMenu.length ? savedMenu : MENU_ITEMS;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  const TOTAL = 1000;
  const BATCH = 100;
  let ok = 0, err = 0;
  const t0 = Date.now();

  const before = await window.kasirAPI.loadTrxFiltered({ page: 0, pageSize: 1 });
  const beforeTotal = Number(before?.total || 0);
  console.log(`📊 Database sebelum test: ${beforeTotal} transaksi`);
  
  console.log(`🚀 Generating ${TOTAL} transactions...`);
  
  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    const txns = Array.from({ length: BATCH }, (_, i) => genTrx(batch * BATCH + i + 1, menuItems, runId));
    
    for (const t of txns) {
      try {
        const r = await window.kasirAPI.processPayment({ trx: t, updatedMenu: null, activeBillId: null });
        if (r?.ok) {
          ok++;
        } else {
          err++;
          console.error(`❌ Gagal menyimpan ${t.id}:`, r?.error || "Respons IPC tidak berhasil");
        }
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
  const afterTotal = Number(v?.total || 0);
  const added = afterTotal - beforeTotal;
  console.log(`🔍 Database sesudah test: ${afterTotal} transaksi (+${added})`);
  if (added !== ok) {
    console.error(`⚠️ Verifikasi berbeda: IPC sukses ${ok}, database bertambah ${added}`);
  }
})();
})();