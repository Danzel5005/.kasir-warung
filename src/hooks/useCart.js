import { useState, useCallback } from "react";
import { calcPrice } from "../utilities/calculations.js";
import { api } from "../utilities/utils.js";

// useCart — cart, activeBill (KEPUTUSAN EKSPLISIT USER: activeBill tetap di
// sini, BUKAN di useBills, karena dia selalu direset bersamaan dengan
// clearCart() — menyatukan mereka membuat relasi itu eksplisit di satu hook).
//
// Ini hook paling cross-cutting di seluruh app: processPayment butuh data
// dari shift (activeShift.id), bills (persistBills untuk hapus bill yang
// dibayar), menu (computeStockDeduction), history (append trx), dan
// printer (printHTML). SEMUA itu diterima sebagai parameter dari App.jsx,
// tidak ada import hook lain di sini.
//
// CATATAN BUG YANG BELUM DI-ROOT-CAUSE (Lag_Fix.md Tahap 2):
// loadBillToCart dipanggil dari tombol "Bayar" di view Open Bill, diikuti
// `setTimeout(()=>setPayModal(true), 300)` — pola asli ini DIPERTAHANKAN
// PERSIS di App.jsx (tidak diubah di sini), supaya kalau bug race condition
// activeBill masih muncul setelah migrasi, itu bukan disebabkan oleh
// perubahan pola di migrasi ini.
//
// PERHATIAN KHUSUS untuk useCallback di file ini: processPayment membaca
// `activeBill` langsung dari closure — variabel yang SAMA yang diduga
// terlibat dalam race condition Tahap 2. Dependency array di bawah
// diverifikasi dengan sangat hati-hati: salah satu deps hilang di sini
// bisa MENCIPTAKAN stale closure baru, bukan cuma gagal mencegah yang lama.
function useCart({ toast_, getNow }) {
  const [cart, setCart]         = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tableNum, setTableNum] = useState("");
  const [pax, setPax]           = useState("");
  const [metode, setMetode]     = useState("cash");
  const [paid, setPaid]         = useState("");
  const [activeBill, setActiveBill] = useState(null);
  const [additionalsModal, setAdditionalsModal] = useState({ open: false, item: null });
  const [pendingItem, setPendingItem] = useState(null);

  const items    = Object.values(cart);
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
  const { pajak, service, total } = calcPrice(subtotal);
  const paidNum   = parseInt(paid.replace(/\D/g, "")) || 0;
  const kembalian = paidNum - total;
  const canPay    = items.length > 0 && tableNum.trim() !== "" && (metode !== "cash" || paidNum >= total);

  // PENTING: pakai functional update setCart(c=>...), TIDAK baca `cart`
  // langsung dari closure — pattern paling stabil. Tapi memanggil toast_,
  // jadi tetap perlu [toast_] di deps (toast_ sendiri stabil/[]).
  const addToCart = useCallback((item, additionals = null) => {
    if (item.stok === 0) { toast_(`Stok "${item.nama}" habis`, "err"); return; }
    setCart(c => {
      const cartKey = additionals 
        ? `${item.id}_${JSON.stringify(additionals)}` 
        : item.id;
      return { 
        ...c, 
        [cartKey]: { 
          ...item, 
          id: item.id, // Keep original id for stock tracking
          cartKey: cartKey, // Store unique cart key
          qty: (c[cartKey]?.qty || 0) + 1,
          additionals: additionals || undefined,
        } 
      };
    });
  }, [toast_]);

  // deps kosong aman: functional update penuh, tidak baca state luar sama sekali.
  // Note: id parameter is now cartKey which may include additionals in the format "itemId_{...}"
  const decCart = useCallback((cartKey) => setCart(c => { 
    const n = { ...c }; 
    if (!n[cartKey]) return c;
    if (n[cartKey].qty <= 1) delete n[cartKey]; 
    else n[cartKey] = { ...n[cartKey], qty: n[cartKey].qty - 1 }; 
    return n; 
  }), []);
  const delCart = useCallback((cartKey) => setCart(c => { 
    const n = { ...c }; 
    delete n[cartKey]; 
    return n; 
  }), []);

  // deps kosong aman: semua setter dengan nilai konstan, tidak baca state.
  const clearCart = useCallback(() => {
    setCart({}); setTableNum(""); setPax(""); setPaid(""); setMetode("cash"); setActiveBill(null);
  }, []);

  // saveOpenBill & loadBillToCart tinggal di sini (bukan useBills) karena
  // mereka menulis langsung ke state cart/activeBill yang dimiliki hook ini.
  // `bills`/`billId`/`persistBills`/`setBillId` adalah ARGUMEN PANGGILAN
  // (dipass tiap kali dipanggil dari App.jsx), bukan closure dependency —
  // jadi TIDAK masuk deps array, sesuai aturan exhaustive-deps untuk
  // parameter fungsi.
  //
  // PENTING: items, tableNum, activeBill, pax dibaca LANGSUNG dari closure.
  // Tanpa activeBill di deps, saveOpenBill akan selalu mengira tidak ada
  // activeBill (selalu masuk cabang "buat baru" bukan "update") — bug baru
  // yang jauh lebih parah dari yang sedang kita selidiki.
  const saveOpenBill = useCallback(async ({ bills, billId, persistBills, setBillId }) => {
    if (!items.length || !tableNum.trim()) { toast_("Isi meja dan pesanan dulu", "err"); return; }
    const t = getNow();
    let updated;
    if (activeBill) {
      updated = bills.map(b =>
        b.id === activeBill.id
          ? { ...b, tableNum: tableNum.trim(), items: [...items], pax: parseInt(pax) || b.pax || 0, updatedAt: t.timestamp }
          : b
      );
      toast_('Open Bill Meja diperbarui', "ok");
    } else {
      const bill = { id: billId, tableNum: tableNum.trim(), pax: parseInt(pax) || 0, items: [...items], createdAt: t.timestamp, updatedAt: t.timestamp, status: "open" };
      updated = [...bills, bill];
      setBillId(n => n + 1);
      toast_('Open Bill Meja dibuat', "ok");
    }
    await persistBills(updated);
    clearCart();
    setDrawerOpen(false);
  }, [items, tableNum, activeBill, pax, toast_, getNow, clearCart]);

  // deps kosong aman: `bill` datang sebagai argumen, tidak baca state luar,
  // hanya setter. Ini fungsi yang dipanggil tombol "Bayar" Open Bill —
  // dipertahankan persis, lihat catatan bug di atas file ini.
  const loadBillToCart = useCallback((bill) => {
    const c = {};
    bill.items.forEach(i => { c[i.id] = { ...i }; });
    setCart(c);
    setTableNum(bill.tableNum);
    setPax(String(bill.pax || ""));
    setActiveBill(bill);
    setDrawerOpen(true);
  }, []);

  // processPayment — paling cross-cutting. Semua dependency lintas-domain
  // (trxId, activeShift, computeStockDeduction, dst) adalah ARGUMEN
  // PANGGILAN, bukan closure dependency — TIDAK masuk deps array.
  //
  // PENTING — baca dengan teliti: tableNum, pax, items, subtotal, metode,
  // paidNum, kembalian, activeBill, cart SEMUA dibaca langsung dari closure.
  // activeBill khususnya — variabel yang diduga terlibat race condition
  // Tahap 2. Dependency array di bawah WAJIB lengkap, atau processPayment
  // akan selalu pakai snapshot dari render pertama (cart kosong, activeBill
  // null selamanya) — bug katastropik, bukan cuma stale.
  const processPayment = useCallback(async ({
    trxId, setTrxId, activeShift,
    computeStockDeduction, commitMenu,
    appendHistory,
    removeBillLocal,
    onSuccess,
  }) => {
    const t = getNow();
    const { pajak: p, service: s, total: tot } = calcPrice(subtotal);
    const trx = {
      id: trxId, ...t, meja: tableNum.trim(), pax: parseInt(pax) || 0, items: [...items],
      subtotal, pajak: p, service: s, total: tot, metodeBayar: metode,
      bayar: metode === "cash" ? paidNum : tot,
      kembalian: metode === "cash" ? kembalian : 0,
      shiftId: activeShift?.id || null, shiftNum: activeShift?.shiftNum || null,
    };
    const updatedMenu = computeStockDeduction(cart);
    // activeBill?.id dibaca di SAAT INI, tidak ada await sebelumnya di fungsi
    // ini yang membuatnya stale — kalau bug race condition masih terjadi,
    // root cause-nya kemungkinan activeBill SUDAH null di state SEBELUM
    // fungsi ini dipanggil (lihat catatan setTimeout di file ini bagian atas).
    const billIdToClose = activeBill?.id || null;
    const result = await api.processPayment({ trx, updatedMenu, activeBillId: billIdToClose });

    if (!result.ok) { toast_("Gagal menyimpan transaksi", "err"); return null; }

    commitMenu(updatedMenu);     // setMenu — commit HANYA setelah IPC sukses
    appendHistory(trx);          // setHistory(h=>[trx,...h])
    setTrxId(n => n + 1);
    // FIX BARU (di luar scope migrasi murni, keputusan eksplisit user):
    // App.jsx ASLI tidak pernah sinkronkan state `bills` setelah payment —
    // main.js sudah hapus dari file, tapi React state stale. Baris di bawah
    // memperbaiki itu TANPA menulis ulang file (lihat useBills.removeBillLocal).
    removeBillLocal(billIdToClose);
    clearCart();
    if (onSuccess) onSuccess(trx);
    return trx;
  }, [tableNum, pax, items, subtotal, metode, paidNum, kembalian, activeBill, cart, toast_, getNow, clearCart]);

  return {
    cart, drawerOpen, tableNum, pax, metode, paid, activeBill,
    items, subtotal, pajak, service, total, paidNum, kembalian, canPay,
    setDrawerOpen, setTableNum, setPax, setMetode, setPaid,
    addToCart, decCart, delCart, clearCart,
    saveOpenBill, loadBillToCart, processPayment,
  };
}

export { useCart };
