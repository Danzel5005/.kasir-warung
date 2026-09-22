import { useCallback, useMemo, useState } from "react";
import { api } from "../utilities/utils.js";
import { DEFAULT_BAHAN_BAKU, normalizeBahan, lowStockBahan, totalNilaiBahan, applyBahanDelta } from "../utilities/bahanBaku.js";
import { DEFAULT_SUPPLIER, normalizeSupplier, findSupplier, supplierLabel } from "../utilities/supplier.js";
import { DEFAULT_LOYALTY_TIERS, normalizeLoyaltyTiers, tierForTotal, tierDiscount } from "../utilities/loyalty.js";
import { hppFromResep, hppForMenus, marginFromResep, bahanDeltasFromItems } from "../utilities/resepHpp.js";

function normalizeResep(input) {
  const out = {};
  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const menuId of Object.keys(input)) {
      const lines = Array.isArray(input[menuId]) ? input[menuId] : [];
      out[String(menuId)] = lines
        .map((l) => ({ bahanId: String(l?.bahanId || "").trim(), qty: Number(l?.qty || 0) }))
        .filter((l) => l.bahanId && l.qty > 0);
    }
  }
  return out;
}

// Hook data fitur advanced (resep/HPP, bahan baku, supplier, loyalty tiers).
// Storage keys terpisah; lihat electron/main.cjs FILES + utilities/utils.js api.
export function useAdvancedData({ toast_ }) {
  const [resep, setResep] = useState({});
  const [bahanBaku, setBahanBaku] = useState([]);
  const [supplier, setSupplier] = useState([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState(DEFAULT_LOYALTY_TIERS);

  const loadInitial = useCallback((savedResep, savedBahan, savedSupplier, savedTiers) => {
    setResep(normalizeResep(savedResep));
    setBahanBaku(Array.isArray(savedBahan) ? savedBahan.map(normalizeBahan) : [...DEFAULT_BAHAN_BAKU]);
    setSupplier(Array.isArray(savedSupplier) ? savedSupplier.map(normalizeSupplier) : [...DEFAULT_SUPPLIER]);
    setLoyaltyTiers(normalizeLoyaltyTiers(savedTiers));
  }, []);

  // Persist helpers. Ketika dipanggil TANPA argumen (mis. dari AdvancedDataPanel
  // yang hanya ingin "flush" setelah upsert/delete), cukup persist state
  // terkini — JANGAN timpa state dengan undefined. Hanya set state kalau
  // argumen eksplisit diberikan.
  const saveResep = useCallback(async (next) => {
    const value = next === undefined ? resep : normalizeResep(next);
    if (next !== undefined) setResep(value);
    try {
      await api.saveResep(value);
    } catch (err) {
      if (toast_) toast_("Gagal menyimpan resep", "err");
    }
  }, [resep, toast_]);

  const saveBahanBaku = useCallback(async (next) => {
    const value = next === undefined
      ? bahanBaku
      : (Array.isArray(next) ? next.map(normalizeBahan) : bahanBaku);
    if (next !== undefined) setBahanBaku(value);
    try {
      await api.saveBahanBaku(value);
    } catch (err) {
      if (toast_) toast_("Gagal menyimpan bahan baku", "err");
    }
  }, [bahanBaku, toast_]);

  const saveSupplier = useCallback(async (next) => {
    const value = next === undefined
      ? supplier
      : (Array.isArray(next) ? next.map(normalizeSupplier) : supplier);
    if (next !== undefined) setSupplier(value);
    try {
      await api.saveSupplier(value);
    } catch (err) {
      if (toast_) toast_("Gagal menyimpan supplier", "err");
    }
  }, [supplier, toast_]);

  const saveLoyaltyTiers = useCallback(async (next) => {
    const normalized = normalizeLoyaltyTiers(next === undefined ? loyaltyTiers : next);
    if (next !== undefined) setLoyaltyTiers(normalized);
    try {
      await api.saveLoyaltyTiers(normalized);
    } catch (err) {
      if (toast_) toast_("Gagal menyimpan loyalty tier", "err");
    }
  }, [loyaltyTiers, toast_]);

  // ── Resep helpers ──────────────────────────────────────────────
  const setMenuResep = useCallback((menuId, lines) => {
    const key = String(menuId);
    setResep((prev) => {
      const next = { ...prev, [key]: normalizeResep({ [key]: lines })[key] || [] };
      api.saveResep(next);
      return next;
    });
  }, []);

  const clearMenuResep = useCallback((menuId) => {
    const key = String(menuId);
    setResep((prev) => {
      const next = { ...prev };
      delete next[key];
      api.saveResep(next);
      return next;
    });
  }, []);

  // ── Bahan baku helpers ─────────────────────────────────────────
  const upsertBahan = useCallback((input) => {
    const item = normalizeBahan(input);
    if (!item.id) item.id = `bahan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    item.updatedAt = new Date().toISOString();
    setBahanBaku((prev) => {
      const exists = prev.some((b) => b.id === item.id);
      const next = exists ? prev.map((b) => (b.id === item.id ? item : b)) : [...prev, item];
      api.saveBahanBaku(next);
      return next;
    });
    return item;
  }, []);

  const deleteBahan = useCallback((id) => {
    setBahanBaku((prev) => {
      const next = prev.filter((b) => b.id !== id);
      api.saveBahanBaku(next);
      return next;
    });
  }, []);

  // applyBahanUsage — potong/kembalikan stok bahan baku berdasarkan item yang
  // terjual dan resep menu. sign: -1 saat penjualan (potong), +1 saat
  // void/hapus transaksi (kembalikan). Persist dilakukan di dalam updater agar
  // selalu memakai state terkini (menghindari stale-closure saat pembayaran).
  // Mengembalikan { changed, applied } untuk pelaporan/log.
  const applyBahanUsage = useCallback((items, sign = -1) => {
    const deltas = bahanDeltasFromItems(items, resep, sign);
    if (!deltas || Object.keys(deltas).length === 0) return { changed: false, applied: deltas || {} };
    let changed = false;
    setBahanBaku((prev) => {
      const { list, changed: c } = applyBahanDelta(prev, deltas, new Date().toISOString());
      changed = c;
      if (c) api.saveBahanBaku(list);
      return c ? list : prev;
    });
    return { changed, applied: deltas };
  }, [resep]);

  // ── Supplier helpers ───────────────────────────────────────────
  const upsertSupplier = useCallback((input) => {
    const item = normalizeSupplier(input);
    if (!item.id) item.id = `sup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    item.updatedAt = new Date().toISOString();
    setSupplier((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      const next = exists ? prev.map((s) => (s.id === item.id ? item : s)) : [...prev, item];
      api.saveSupplier(next);
      return next;
    });
    return item;
  }, []);

  const deleteSupplier = useCallback((id) => {
    setSupplier((prev) => {
      const next = prev.filter((s) => s.id !== id);
      api.saveSupplier(next);
      return next;
    });
  }, []);

  // ── Derived computations ───────────────────────────────────────
  const hppByMenu = useMemo(() => hppForMenus(resep, bahanBaku), [resep, bahanBaku]);
  const lowStock = useMemo(() => lowStockBahan(bahanBaku), [bahanBaku]);
  const totalNilai = useMemo(() => totalNilaiBahan(bahanBaku), [bahanBaku]);

  const hppFor = useCallback((menuId) => {
    const key = String(menuId);
    const entry = hppByMenu[key];
    return entry ? entry.hpp : null;
  }, [hppByMenu]);

  const marginFor = useCallback((menuId, hargaJual) => {
    const key = String(menuId);
    const lines = resep[key] || [];
    return marginFromResep(hargaJual, lines, bahanBaku);
  }, [resep, bahanBaku]);

  return {
    resep,
    bahanBaku,
    supplier,
    loyaltyTiers,
    loadInitial,
    saveResep,
    saveBahanBaku,
    saveSupplier,
    saveLoyaltyTiers, setLoyaltyTiers, setMenuResep,
    clearMenuResep,
    upsertBahan,
    deleteBahan,
    applyBahanUsage,
    upsertSupplier,
    deleteSupplier,
    hppByMenu,
    hppFor,
    marginFor,
    lowStock,
    totalNilai,
    // pure re-exports for convenience
    findSupplier,
    supplierLabel,
    tierForTotal,
    tierDiscount,
    hppFromResep,
  };
}
