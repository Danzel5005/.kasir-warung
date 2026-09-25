// resepHpp.js — hitung HPP dari resep (Fase 1, fitur "Resep HPP Otomatis").
//
// Fungsi murni: HPP suatu menu dihitung dari komposisi bahan baku (resep) x
// harga satuan bahan. Data resep disimpan di settings.advancedData.resep
// (map menuId -> [{ bahanId, qty }]), bahan baku dari utilities/bahanBaku.js.
// Flag: advancedFeatures.resepHpp.

// Hitung HPP satu resep. resep: [{ bahanId, qty }]. bahanList: array bahan baku.
export function hppFromResep(resep = [], bahanList = []) {
  const map = new Map(
    (Array.isArray(bahanList) ? bahanList : []).map((b) => [String(b?.id || "").trim(), b])
  );
  let hpp = 0;
  const missing = [];
  for (const line of Array.isArray(resep) ? resep : []) {
    const id = String(line?.bahanId || "").trim();
    const qty = Number(line?.qty || 0);
    if (!id || qty <= 0) continue;
    const bahan = map.get(id);
    if (!bahan) {
      missing.push(id);
      continue;
    }
    hpp += qty * Number(bahan.hargaSatuan || 0);
  }
  return { hpp: Math.round(hpp), missing };
}

// HPP seluruh menu: map menuId -> resep. Return map menuId -> { hpp, missing }.
export function hppForMenus(resepMap = {}, bahanList = []) {
  const out = {};
  for (const menuId of Object.keys(resepMap || {})) {
    out[menuId] = hppFromResep(resepMap[menuId], bahanList);
  }
  return out;
}

// Margin kotor sebuah menu bila HPP dari resep diketahui.
export function marginFromResep(hargaJual = 0, resep = [], bahanList = []) {
  const { hpp } = hppFromResep(resep, bahanList);
  const jual = Number(hargaJual || 0);
  const profit = jual - hpp;
  return { hpp, profit, marginPct: jual > 0 ? profit / jual : 0 };
}

// bahanDeltasFromItems — konversi item penjualan (cart/trx) menjadi delta
// pemakaian bahan baku berdasarkan resep. Untuk tiap item yang punya resep,
// setiap baris resep (bahanId, qty) dikalikan dengan qty yang terjual (dalam
// satuan dasar), lalu diagregasi per bahanId.
//
// items   : [{ id, qty, baseQty? }] (qty selalu satuan dasar; baseQty dipakai
//           kalau ada, mengikuti logika stockDeltasFromTrx).
// resep   : map menuId -> [{ bahanId, qty }].
// sign    : -1 = potong stok (penjualan), +1 = kembalikan stok (void/hapus).
// Return  : { [bahanId]: delta }.
export function bahanDeltasFromItems(items = [], resep = {}, sign = -1) {
  const deltas = {};
  if (!Array.isArray(items)) return deltas;
  const resepMap = resep && typeof resep === "object" && !Array.isArray(resep) ? resep : {};
  for (const it of items) {
    const menuId = String(it?.id ?? "").trim();
    if (!menuId) continue;
    const lines = Array.isArray(resepMap[menuId]) ? resepMap[menuId] : null;
    if (!lines || lines.length === 0) continue;
    const soldQty = Math.abs(Number(it?.baseQty ?? it?.qty) || 0);
    if (soldQty === 0) continue;
    for (const line of lines) {
      const bahanId = String(line?.bahanId || "").trim();
      const perUnit = Number(line?.qty || 0);
      if (!bahanId || perUnit <= 0) continue;
      deltas[bahanId] = (deltas[bahanId] || 0) + sign * soldQty * perUnit;
    }
  }
  return deltas;
}

// bahanBakuUsage — daftar resep (menu) yang memakai sebuah bahan baku.
// Dipakai modal detail bahan baku: "di resep mana saja bahan ini dipakai".
//
// bahanId : id bahan baku yang dicari.
// resep   : map menuId -> [{ bahanId, qty }].
// menu    : daftar menu [{ id, nama }] untuk label nama menu.
// Return  : [{ menuId, nama, qty }] terurut nama menu (A-Z); qty = per 1 porsi.
export function bahanBakuUsage(bahanId = "", resep = {}, menu = []) {
  const key = String(bahanId || "").trim();
  if (!key) return [];
  const resepMap = resep && typeof resep === "object" && !Array.isArray(resep) ? resep : {};
  const nameMap = new Map(
    (Array.isArray(menu) ? menu : []).map((m) => [String(m?.id ?? "").trim(), String(m?.nama || "").trim()])
  );
  const out = [];
  for (const menuId of Object.keys(resepMap)) {
    const lines = Array.isArray(resepMap[menuId]) ? resepMap[menuId] : [];
    const hits = lines.filter((l) => String(l?.bahanId || "").trim() === key);
    if (hits.length === 0) continue;
    const nama = nameMap.get(String(menuId).trim());
    if (!nama) continue;
    const qty = hits.reduce((sum, l) => sum + Number(l?.qty || 0), 0);
    out.push({
      menuId,
      nama,
      qty,
    });
  }
  out.sort((a, b) => a.nama.localeCompare(b.nama));
  return out;
}
