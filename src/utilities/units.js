// units.js — Multi-satuan + tier harga (Langkah 3)
//
// Modul MURNI (tidak mengimpor React, hook, atau api). Semua fungsi di sini
// hanya membaca item (objek menu / baris keranjang) dan mengembalikan nilai.
// Ini penting supaya bisa dites langsung tanpa DOM/IPC.
//
// Bentuk data di JSON item (field `data` di tabel products):
//   satuan        : string label satuan dasar (mis. "pcs") — informatif
//   units         : [{ key, label, factor, harga, modal? }]
//                   factor = berapa satuan dasar dalam 1 satuan ini (>= 2)
//   priceTiers    : [{ minQty, harga }]  // minQty dalam satuan DASAR
//
// Aturan (sesuai GAPCLOSING.md):
//   - Tier hanya berlaku untuk satuan DASAR, dihitung per baris pakai
//     `baseQty` (qty baris dikonversi ke satuan dasar).
//   - Item lama tanpa `units` tetap jalan persis seperti sebelumnya.
//   - Harga tier = harga satuan dasar dikali baseQty (harga/pcs tetap
//     dipakai untuk perhitungan diskon & struk supaya kolom qty/harga
//     baris tetap konsisten).

// ---- helper kecil -------------------------------------------------------

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const has = (v) => v !== null && v !== undefined && v !== "";

/**
 * Satuan dasar (key "" / null) — selalu ada, factor 1, harga = item.harga.
 */
export function baseUnit(item) {
  return {
    key: "",
    label: item?.satuan || item?.label || "",
    factor: 1,
    harga: num(item?.harga),
    modal: has(item?.modal) ? num(item.modal) : null,
  };
}

/**
 * Cari satuan tambahan berdasarkan key. Mengembalikan null kalau tidak ada.
 */
export function findUnit(item, unitKey) {
  if (!unitKey) return null;
  const units = Array.isArray(item?.units) ? item.units : [];
  return units.find((u) => String(u?.key) === String(unitKey)) || null;
}

/**
 * Daftar satuan yang bisa dipilih untuk sebuah item.
 * Item tanpa `units` → hanya satuan dasar.
 */
export function unitOptions(item) {
  const opts = [baseUnit(item)];
  const units = Array.isArray(item?.units) ? item.units : [];
  units.forEach((u) => {
    if (!u || !u.key) return;
    opts.push({
      key: String(u.key),
      label: u.label || String(u.key),
      factor: num(u.factor) || 1,
      harga: num(u.harga),
      modal: has(u.modal) ? num(u.modal) : null,
    });
  });
  return opts;
}

/**
 * stockQty(item) — berapa satuan dasar yang dipakai satu baris keranjang.
 * Tanpa units → qty apa adanya (perilaku lama).
 */
export function stockQty(item, qtyOverride = undefined, unitKey = undefined) {
  const qty = qtyOverride === undefined ? num(item?.qty) : num(qtyOverride);
  const key = unitKey === undefined ? item?.unit : unitKey;
  if (!key) return qty;
  const u = findUnit(item, key);
  const factor = u ? num(u.factor) || 1 : 1;
  return qty * factor;
}

/**
 * Tier harga berlaku untuk total baseQty satu baris.
 * Mengembalikan harga per satuan DASAR yang berlaku, atau null kalau tidak
 * ada tier yang cocok. Tier dipilih yang minQty-nya paling besar namun
 * masih <= baseQty (asumsi daftar naik; tetap benar walau tidak urut).
 */
export function tierPrice(item, baseQty) {
  const tiers = Array.isArray(item?.priceTiers) ? item.priceTiers : [];
  if (!tiers.length) return null;
  let best = null;
  tiers.forEach((t) => {
    if (!t) return;
    const minQty = num(t.minQty);
    const harga = num(t.harga);
    if (minQty <= 0 || !(baseQty >= minQty)) return;
    if (best === null || minQty > best.minQty) best = { minQty, harga };
  });
  return best ? best.harga : null;
}

/**
 * resolveLine(item, unitKey, qty) — inti Langkah 3.
 *
 * Mengembalikan baris siap-pakai untuk keranjang/struk/laporan:
 *   { unit, harga, modal, baseQty, tierMinQty?, subtotal }
 *
 * - `unit`    : { key, label, factor, harga, modal }
 * - `harga`   : harga satuan DASAR efektif (setelah tier, kalau ada)
 * - `modal`   : modal satuan dasar (null kalau tidak diketahui)
 * - `baseQty` : qty baris dalam satuan dasar
 * - `subtotal`: harga * baseQty — dipakai untuk verifikasi/test
 *
 * CATATAN: `harga` yang dikembalikan SELALU per satuan dasar (bukan harga
 * per unit baris) supaya `i.harga * i.qty` di kalkulasi tetap konsisten
 * dengan yang sudah ada. Untuk satuan non-dasar, `qty` di keranjang
 * disimpan dalam satuan dasar hasil perkalian factor saat ditambahkan.
 */
export function resolveLine(item, unitKey = null, qty = undefined) {
  const unit = findUnit(item, unitKey) || baseUnit(item);
  const normalizedUnit = {
    key: unitKey ? String(unitKey) : "",
    label: unit.label || "",
    factor: num(unit.factor) || 1,
    harga: num(unit.harga),
    modal: has(unit.modal) ? num(unit.modal) : null,
  };

  const rawQty = qty === undefined ? num(item?.qty) : num(qty);
  const baseQty = rawQty * normalizedUnit.factor;

  const hargaDasar = normalizedUnit.key
    ? num(item?.harga)
    : normalizedUnit.harga;
  const tier = normalizedUnit.key ? null : tierPrice(item, baseQty);
  const harga = tier === null ? hargaDasar : tier;

  const modal = normalizedUnit.key
    ? has(item?.modal)
      ? num(item.modal)
      : null
    : has(normalizedUnit.modal)
      ? normalizedUnit.modal
      : null;

  return {
    unit: normalizedUnit,
    harga,
    modal,
    baseQty,
    tierHarga: tier,
    subtotal: harga * baseQty,
  };
}

/**
 * cartKeyFor(itemId, unitKey) — kunci keranjang:
 *   satuan dasar → id polos (kompatibel dengan data lama)
 *   satuan lain  → id@unitKey
 */
export function cartKeyFor(itemId, unitKey) {
  return unitKey ? `${itemId}@${unitKey}` : String(itemId);
}
