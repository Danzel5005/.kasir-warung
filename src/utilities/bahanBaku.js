// bahanBaku.js — stok bahan mentah (Fase 1, fitur "Bahan Baku").
//
// Fungsi murni untuk menghitung status stok bahan baku. Data bahan baku
// disimpan di settings.advancedData.bahanBaku (array) lewat useSettings,
// sehingga tetap persisten tanpa menyentuh skema storage baru.
// Flag: advancedFeatures.bahanBaku.

export const DEFAULT_BAHAN_BAKU = [];

// Normalisasi satu entri bahan baku agar aman dibaca UI.
export function normalizeBahan(item = {}) {
  return {
    id: item.id || "",
    nama: String(item.nama || "").trim(),
    satuan: String(item.satuan || "").trim(),
    stok: Number(item.stok || 0),
    minStok: Number(item.minStok || 0),
    hargaSatuan: Number(item.hargaSatuan || 0),
    supplierId: item.supplierId || "",
    updatedAt: item.updatedAt || "",
  };
}

// Daftar bahan yang stoknya di bawah (atau sama dengan) minStok.
export function lowStockBahan(list = []) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeBahan)
    .filter((b) => b.nama && b.minStok > 0 && b.stok <= b.minStok);
}

// Nilai total persediaan bahan baku (stok * hargaSatuan).
export function totalNilaiBahan(list = []) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeBahan)
    .reduce((sum, b) => sum + b.stok * b.hargaSatuan, 0);
}

// applyBahanDelta — terapkan delta pemakaian ke daftar bahan baku.
// deltas: { [bahanId]: delta }. Stok di-clamp ke >= 0 (mirror applyStockDelta
// di main process untuk stok menu). Fungsi murni: mengembalikan list BARU.
//   { list, changed } — changed: true bila ada nilai yang benar-benar berubah.
export function applyBahanDelta(list = [], deltas = {}, now = "") {
  const src = Array.isArray(list) ? list : [];
  const map = deltas && typeof deltas === "object" ? deltas : {};
  let changed = false;
  const next = src.map((raw) => {
    const b = normalizeBahan(raw);
    const d = map[b.id];
    if (d === undefined || d === null) return b;
    const delta = Number(d) || 0;
    if (delta === 0) return b;
    const after = Math.max(0, b.stok + delta);
    if (after === b.stok) return b; // sudah 0 & makin dipotong → tak berubah
    changed = true;
    return { ...b, stok: after, updatedAt: now || b.updatedAt };
  });
  return { list: next, changed };
}
