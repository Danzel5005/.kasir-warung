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

/**
 * linePricing(line) — harga & modal efektif per SATUAN DASAR untuk sebuah
 * BARIS KERANJANG.
 *
 * Berbeda dengan `resolveLine` (yang menerima qty dalam SATUAN TAMPILAN),
 * fungsi ini menerima baris keranjang di mana `qty` SUDAH dalam satuan dasar
 * (lihat komentar `lineBaseQty` di useCart.js). Tujuannya menutup bug:
 * memilih satuan tambahan / melewati batas tier harus mengubah harga akhir.
 *
 * Aturan:
 *  - Satuan dasar (key ""): harga per dasar = tier aktif (kalau ada) atau
 *    item.harga. Tier dihitung dari baseQty (qty baris apa adanya).
 *  - Satuan non-dasar: harga per dasar = unit.harga / factor, sehingga
 *    harga satu unit utuh = unit.harga. Kalau unit.harga tidak diisi,
 *    jatuh ke item.harga (perilaku lama, harga tidak berubah).
 *
 * Mengembalikan { harga, modal, baseQty, tierHarga, unit } siap dipakai
 * untuk mengisi field baris keranjang.
 */
export function linePricing(line) {
  const item = line || {};
  const unitKey = item.unit || "";
  const unit = findUnit(item, unitKey) || baseUnit(item);
  const factor = num(unit.factor) || 1;
  const baseQty = num(item.qty); // qty baris SUDAH satuan dasar

  let harga;
  let tier = null;
  if (!unitKey) {
    tier = tierPrice(item, baseQty);
    harga = tier === null ? num(item.harga) : tier;
  } else {
    const unitHarga = num(unit.harga);
    harga = unitHarga > 0 ? unitHarga / factor : num(item.harga);
  }

  // modal per satuan dasar: pakai modal unit (per-unit) dibagi factor kalau
  // ada, kalau tidak modal item. Item tanpa modal → null.
  let modal = null;
  if (unitKey) {
    if (has(unit.modal)) modal = num(unit.modal) / factor;
    else if (has(item.modal)) modal = num(item.modal);
  } else if (has(item.modal)) {
    modal = num(item.modal);
  }

  return {
    unit: { key: unitKey, label: unit.label || "", factor, harga: num(unit.harga) },
    harga,
    modal,
    baseQty,
    tierHarga: tier,
  };
}

/**
 * stepQtyForUnit(line) — berapa SATUAN DASAR yang berkurang/bertambah saat
 * user menekan tombol +/- pada sebuah baris keranjang. Sama dengan factor
 * satuan aktif baris itu (default 1 untuk satuan dasar / item tanpa units).
 *
 * Dipakai `decCart` supaya satu klik minus mengurangi satu SATUAN TAMPILAN
 * (mis. 1 dus = 24 pcs), bukan 1 satuan dasar (Bug #1).
 */
export function stepQtyForUnit(line) {
  const opts = unitOptions(line);
  const active = opts.find((o) => String(o.key) === String(line?.unit || "")) || opts[0];
  return num(active?.factor) || 1;
}

/**
 * computeStockErrors({ menu, cartItems, heldItems, baseQtyOf }) — daftar
 * baris yang melebihi stok tersedia (Bug #2).
 *
 *   - `menu`      : daftar item menu (punya id & stok; stok null = tak terbatas)
 *   - `cartItems` : baris keranjang yang dicek (qty dalam satuan dasar)
 *   - `heldItems` : baris open bill aktif (qty-nya SUDAH dipotong dari stok;
 *                   ditambahkan kembali supaya bill yang valid tidak dianggap
 *                   kelebihan stok)
 *   - `baseQtyOf` : konversi baris → qty satuan dasar
 *
 * Mengembalikan array `{ id, nama, needed, available }` untuk tiap item yang
 * melebihi stok. Murni — tidak menyentuh React/DOM, jadi bisa dites langsung.
 */
export function computeStockErrors({ menu = [], cartItems = [], heldItems = [], baseQtyOf }) {
  const toBase = typeof baseQtyOf === "function" ? baseQtyOf : (line) => num(line?.qty);

  const stockById = {};
  menu.forEach((m) => { stockById[String(m.id)] = m; });

  const heldById = {};
  (heldItems || []).forEach((i) => {
    heldById[String(i.id)] = (heldById[String(i.id)] || 0) + toBase(i);
  });

  const cartById = {};
  (cartItems || []).forEach((i) => {
    cartById[String(i.id)] = (cartById[String(i.id)] || 0) + toBase(i);
  });

  const errs = [];
  Object.keys(cartById).forEach((id) => {
    const m = stockById[id];
    const stok = m ? m.stok : undefined;
    if (stok === null || stok === undefined) return; // tak terbatas / tak dikenal
    const available = num(stok) + num(heldById[id]);
    if (cartById[id] > available) {
      errs.push({ id, nama: m?.nama || id, needed: cartById[id], available });
    }
  });
  return errs;
}
