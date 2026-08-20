import { useState, useCallback } from "react";
import { api } from "../utilities/utils.js";

// useBills — array open bills + ID counter + CRUD murni.
// SENGAJA tidak menyimpan activeBill (itu di useCart, keputusan eksplisit
// user karena activeBill selalu di-reset bersamaan dengan clearCart()).
// saveOpenBill & loadBillToCart juga TIDAK di sini — mereka menulis ke
// state cart secara langsung, jadi tinggal di useCart untuk menghindari
// dua hook saling menulis ke state satu sama lain.
function useBills({ toast_, addUndo }) {
  const [bills, setBills] = useState([]);
  const [billId, setBillId] = useState(1);

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedBills) => {
    const list = savedBills || [];
    setBills(list);
    const maxB = list.reduce((m, b) => Math.max(m, b.id || 0), 0);
    setBillId(maxB + 1);
  }, []);

  // PENTING: membaca bills LANGSUNG dari closure untuk snapshot undo. Wajib
  // [bills, addUndo].
  const closeBill = useCallback(async (id) => {
    const snap = [...bills];
    const updated = bills.filter(b => b.id !== id);
    await api.saveBills(updated); setBills(updated);
    addUndo("Hapus Open Bill", async () => { await api.saveBills(snap); setBills(snap); });
  }, [bills, addUndo]);

  // PENTING: membaca bills LANGSUNG dari closure untuk snapshot undo. Wajib
  // [bills, addUndo].
  const clearAllBills = useCallback(async () => {
    const snap = [...bills];
    await api.clearBills(); setBills([]);
    addUndo("Hapus Semua Open Bill", async () => { await api.restoreBills(snap); setBills(snap); });
  }, [bills, addUndo]);

  // Dipakai App.jsx saat menambah/update bill dari cart (saveOpenBill di useCart)
  // dan saat payment sukses (hapus bill yang baru dibayar).
  // deps kosong aman: `updated` datang sebagai argumen, tidak baca state luar.
  const persistBills = useCallback(async (updated) => {
    await api.saveBills(updated);
    setBills(updated);
  }, []);

  // FIX BARU (ditemukan saat migrasi, BUKAN bug yang sudah ada di Lag_Fix.md):
  // setelah processPayment sukses, main.js SUDAH menghapus bill yang dibayar
  // dari open-bills.json secara atomic (lihat process-payment handler di
  // main.js langkah 4). Tapi App.jsx ASLI tidak pernah sinkronkan balik state
  // React `bills` — jadi bill yang sudah dibayar tetap nongol di UI sampai
  // reload. Fungsi ini HANYA update state lokal, TIDAK menulis ulang file
  // (file sudah benar dari main.js) — supaya tidak ada double-write yang
  // bisa konflik dengan atomic write yang sudah jalan di sana.
  // deps kosong aman: pakai functional update setBills(prev=>...), TIDAK
  // baca `bills` langsung dari closure — pattern paling stabil untuk useCallback.
  const removeBillLocal = useCallback((billIdToRemove) => {
    if (!billIdToRemove) return;
    setBills(prev => prev.filter(b => b.id !== billIdToRemove));
  }, []);

  return {
    bills, billId,
    setBillId,
    loadInitial, closeBill, clearAllBills, persistBills, removeBillLocal,
  };
}

export { useBills };
