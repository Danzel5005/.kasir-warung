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
    const list = (savedBills || []).filter(b => b.status === "open" || !b.status);
    setBills(list);
    const maxB = list.reduce((m, b) => Math.max(m, Number(b.id) || 0), 0);
    setBillId(maxB + 1);
  }, []);

  // Close single bill — update state, persist, add undo
  // Uses functional update to avoid stale closure
  const closeBill = useCallback(async (id) => {
    if (!id) return;
    setBills(prev => {
      const snap = [...prev];
      const updated = prev.filter(b => String(b.id) !== String(id));
      api.saveBills(updated);
      addUndo("Hapus Open Bill", async () => {
        await api.saveBills(snap);
        setBills(snap);
      });
      return updated;
    });
  }, [addUndo]);

  // Close single bill WITHOUT payment (cancel) - restore stock
  // This is called when user deletes an open bill without paying
  const cancelBill = useCallback(async (id, { computeStockRestoration, computeStockDeduction, commitMenu }) => {
    if (!id) return;
    setBills(prev => {
      const billToCancel = prev.find(b => String(b.id) === String(id));
      if (!billToCancel) return prev;
      
      const snap = [...prev];
      const updated = prev.filter(b => String(b.id) !== String(id));
      api.saveBills(updated);
      
      // Restore stock if computeStockRestoration is provided
      let restoredMenu = null;
      if (computeStockRestoration && commitMenu && billToCancel.items) {
        restoredMenu = computeStockRestoration(billToCancel.items);
        commitMenu(restoredMenu);
      }
      
      addUndo("Batalkan Open Bill", async () => {
        await api.saveBills(snap);
        setBills(snap);
        // Re-deduct stock when undoing the cancellation
        if (restoredMenu && computeStockDeduction && commitMenu && billToCancel.items) {
          // Convert bill items to object keyed by item.id
          const billItemsById = billToCancel.items.reduce((acc, item) => {
            const existing = acc[item.id] || { qty: 0 };
            acc[item.id] = { ...existing, qty: existing.qty + (item.qty || 0) };
            return acc;
          }, {});
          const reDeductedMenu = computeStockDeduction(billItemsById);
          commitMenu(reDeductedMenu);
        }
      });
      return updated;
    });
  }, [addUndo]);

  // Clear all bills
  const clearAllBills = useCallback(async () => {
    setBills(prev => {
      const snap = [...prev];
      api.clearBills();
      addUndo("Hapus Semua Open Bill", async () => {
        await api.restoreBills(snap);
        setBills(snap);
      });
      return [];
    });
  }, [addUndo]);

  // Persist bills (called from useCart.saveOpenBill and after payment)
  // Uses functional update to avoid stale closure
  const persistBills = useCallback(async (updated) => {
    if (!Array.isArray(updated)) return;
    await api.saveBills(updated);
    setBills(updated);
  }, []);

  // Local-only removal (called after successful payment)
  // Main process already removed from file atomically
  const removeBillLocal = useCallback((billIdToRemove) => {
    if (!billIdToRemove) return;
    setBills(prev => prev.filter(b => String(b.id) !== String(billIdToRemove)));
  }, []);

  // Create new bill
  const createBill = useCallback(async (billData) => {
    const newBill = {
      id: billId,
      ...billData,
      status: "open",
      createdAt: billData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...bills, newBill];
    await persistBills(updated);
    setBillId(n => n + 1);
    return newBill;
  }, [billId, bills, persistBills]);

  // Update existing bill
  const updateBill = useCallback(async (billId, updates) => {
    setBills(prev => {
      const updated = prev.map(b =>
        String(b.id) === String(billId)
          ? { ...b, ...updates, updatedAt: new Date().toISOString() }
          : b
      );
      api.saveBills(updated);
      return updated;
    });
  }, []);

  // Get open bills count
  const openCount = bills.filter(b => b.status === "open").length;

  return {
    bills,
    billId,
    setBillId,
    openCount,
    loadInitial,
    closeBill,
    cancelBill,
    clearAllBills,
    persistBills,
    removeBillLocal,
    createBill,
    updateBill,
  };
}

export { useBills };
