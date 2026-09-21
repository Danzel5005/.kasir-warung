// supplier.js — database supplier (Fase 1, fitur "Database Supplier").
//
// Fungsi murni untuk mengelola daftar supplier sederhana. Data disimpan di
// settings.advancedData.supplier lewat useSettings (persisten, tanpa skema baru).
// Flag: advancedFeatures.supplier.

export const DEFAULT_SUPPLIER = [];

// Normalisasi satu entri supplier.
export function normalizeSupplier(item = {}) {
  return {
    id: item.id || "",
    nama: String(item.nama || "").trim(),
    kontak: String(item.kontak || "").trim(),
    telepon: String(item.telepon || "").trim(),
    alamat: String(item.alamat || "").trim(),
    catatan: String(item.catatan || "").trim(),
    updatedAt: item.updatedAt || "",
  };
}

// Cari supplier berdasarkan id (untuk relasi dari bahan baku / stock-in).
export function findSupplier(list = [], id = "") {
  const key = String(id || "").trim();
  if (!key) return null;
  return (Array.isArray(list) ? list : [])
    .map(normalizeSupplier)
    .find((s) => s.id === key) || null;
}

// Label tampil untuk sebuah supplier id; "-" bila tidak ketemu.
export function supplierLabel(list = [], id = "") {
  const s = findSupplier(list, id);
  return s ? s.nama : "-";
}
