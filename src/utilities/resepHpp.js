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
