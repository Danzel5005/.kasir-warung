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
function useCart({ toast_, getNow, receiptAdditionals = [] }) {
  const [cart, setCart]         = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [receiptAdditionalValues, setReceiptAdditionalValues] = useState({}); // { "nomor_meja": "5", "jumlah_pax": "2" }
  const [metode, setMetode]     = useState("cash");
  const [paid, setPaid]         = useState("");
  const [activeBill, setActiveBill] = useState(null);
  const [additionalsModal, setAdditionalsModal] = useState({ open: false, item: null });
  const [pendingItem, setPendingItem] = useState(null);

  const items    = Object.values(cart);
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0);
  // Get tax/service toggles from receipt additionals (passed via settings in App.jsx)
  // Default to enabled if not configured
  const taxEnabled = receiptAdditionals?.find(f => f.key === "tax")?.enabled !== false;
  const serviceEnabled = receiptAdditionals?.find(f => f.key === "service")?.enabled !== false;
  
  const { pajak, service, total } = calcPrice(subtotal, { taxEnabled, serviceEnabled });
  const paidNum   = parseInt(paid.replace(/\D/g, "")) || 0;
  const kembalian = paidNum - total;

  // Check if all required receipt additionals are filled (moved before canPay to avoid TDZ)
  const checkRequiredAdditionals = useCallback((additionals) => {
    if (!additionals) return true;
    return additionals.every(field => {
      if (!field.required) return true;
      const value = receiptAdditionalValues[field.key];
      return value && String(value).trim() !== "";
    });
  }, [receiptAdditionalValues]);

  // Use checkRequiredAdditionals to validate all required receipt additionals (not just tableNum)
  const canPay    = items.length > 0 && checkRequiredAdditionals(receiptAdditionals) && (metode !== "cash" || paidNum >= total);

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
    setCart({}); setPaid(""); setMetode("cash"); setActiveBill(null); setReceiptAdditionalValues({}); setAdditionalsModal({ open: false, item: null }); setDrawerOpen(false);
  }, []);

  // Update a single receipt additional field value
  const updateReceiptAdditionalValue = useCallback((fieldKey, value) => {
    setReceiptAdditionalValues(prev => ({ ...prev, [fieldKey]: value }));
  }, []);

  // Dynamic canPay - includes receipt additionals validation
  const getCanPay = useCallback((additionals) => {
    if (items.length === 0) return false;
    if (!checkRequiredAdditionals(additionals)) return false;
    return metode !== "cash" || paidNum >= total;
  }, [items, checkRequiredAdditionals, metode, paidNum, total]);
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
    if (!items.length || !checkRequiredAdditionals(receiptAdditionals)) { toast_("Isi field wajib dan pesanan dulu", "err"); return; }
    const t = getNow();
    
    // Build receipt additional values for the bill
    const receiptAdditionalData = {};
    if (receiptAdditionals) {
      receiptAdditionals
        .filter(f => f.category === "receipt" && f.visible !== false)
        .forEach(field => {
          receiptAdditionalData[field.key] = receiptAdditionalValues[field.key] || "";
        });
    }
    
    let updated;
    if (activeBill) {
      updated = bills.map(b =>
        String(b.id) === String(activeBill.id)
          ? { ...b, items: [...items], updatedAt: t.timestamp, ...receiptAdditionalData }
          : b
      );
      toast_('Open Bill diperbarui', "ok");
    } else {
      const bill = { id: billId, items: [...items], createdAt: t.timestamp, updatedAt: t.timestamp, status: "open", ...receiptAdditionalData };
      updated = [...bills, bill];
      setBillId(n => n + 1);
      toast_('Open Bill dibuat', "ok");
    }
    await persistBills(updated);
    clearCart();
    setDrawerOpen(false);
  }, [items, receiptAdditionalValues, receiptAdditionals, activeBill, toast_, getNow, clearCart]);

  // deps kosong aman: `bill` datang sebagai argumen, tidak baca state luar,
  // hanya setter. Ini fungsi yang dipanggil tombol "Bayar" Open Bill —
  // dipertahankan persis, lihat catatan bug di atas file ini.
  const loadBillToCart = useCallback((bill) => {
    const c = {};
    bill.items.forEach(i => { c[i.id] = { ...i }; });
    setCart(c);
    // Load receipt additional values from bill
    if (receiptAdditionals) {
      receiptAdditionals
        .filter(f => f.category === "receipt" && f.visible !== false)
        .forEach(field => {
          if (bill[field.key] !== undefined) {
            setReceiptAdditionalValues(prev => ({ ...prev, [field.key]: bill[field.key] }));
          }
        });
    }
    setActiveBill(bill);
    setDrawerOpen(true);
  }, []);

  // processPayment — paling cross-cutting. Semua dependency lintas-domain
  // (generateTrxId, activeShift, computeStockDeduction, dst) adalah ARGUMEN
  // PANGGILAN, bukan closure dependency — TIDAK masuk deps array.
  //
  // PENTING — baca dengan teliti: items, subtotal, metode,
// paidNum, kembalian, cart SEMUA dibaca langsung dari closure.
// activeBill DIHAPUS dari deps — billIdToClose sekarang dikirim sebagai
// parameter eksplisit dari App.jsx (via cartH.activeBill) untuk menghindari
// race condition pada setTimeout di loadBillAndPay.
const processPayment = useCallback(async ({
  generateTrxId, activeShift,
  computeStockDeduction, commitMenu,
  appendHistory,
  removeBillLocal,
  onSuccess,
  billIdToClose,
  paymentMethods = [],  
}) => {
  const t = getNow();
  const taxEnabled = receiptAdditionals?.find(f => f.key === "tax")?.enabled !== false;
  const serviceEnabled = receiptAdditionals?.find(f => f.key === "service")?.enabled !== false;
  const { pajak: p, service: s, total: tot } = calcPrice(subtotal, { taxEnabled, serviceEnabled });
  
  // Build receipt additional values for the transaction
  const receiptAdditionalData = {};
  if (receiptAdditionals) {
    receiptAdditionals
      .filter(f => f.category === "receipt" && f.visible !== false)
      .forEach(field => {
        receiptAdditionalData[field.key] = receiptAdditionalValues[field.key] || "";
      });
  }
  
  // Resolve payment method label for the transaction (never show key)
  const metodeLabel = paymentMethods.find(m => m.key === metode)?.label 
    ?? globalThis.METODE_LABELS?.[metode] 
    ?? metode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  const trxId = generateTrxId();
  const trx = {
    id: trxId, ...t, items: [...items],
    subtotal, pajak: p, service: s, total: tot, 
    metodeBayar: metode,
    metodeBayarLabel: metodeLabel, // NEW: store label in transaction
    bayar: metode === "cash" ? paidNum : tot,
    kembalian: metode === "cash" ? kembalian : 0,
    shiftId: activeShift?.id || null, shiftNum: activeShift?.shiftNum || null,
    operator: activeShift?.operator || "Kasir", // [2] nama pengguna yang login
    ...receiptAdditionalData, // Include receipt additional fields
  };
  const updatedMenu = computeStockDeduction(cart);
  const result = await api.processPayment({ trx, updatedMenu, activeBillId: billIdToClose });

  if (!result.ok) { toast_("Gagal menyimpan transaksi", "err"); return null; }

  commitMenu(updatedMenu);     // setMenu — commit HANYA setelah IPC sukses
  appendHistory(trx);          // setHistory(h=>[trx,...h])
  // Remove the paid bill from open bills using explicit billIdToClose
  removeBillLocal(billIdToClose);
  clearCart();
  if (onSuccess) onSuccess(trx);
  return trx;
}, [items, subtotal, metode, paidNum, kembalian, cart, toast_, getNow, clearCart]);

  return {
    cart, drawerOpen, receiptAdditionalValues, receiptAdditionals, metode, paid, activeBill,
    items, subtotal, pajak, service, total, paidNum, kembalian, canPay,
    setDrawerOpen, updateReceiptAdditionalValue, setMetode, setPaid,
    addToCart, decCart, delCart, clearCart,
    saveOpenBill, loadBillToCart, processPayment, checkRequiredAdditionals, getCanPay,
  };
}

export { useCart };