// recipeStock.js — authoritative stock derivation for resep+HPP.
//
// Producible quantity for a menu = min over all recipe lines of
//   floor(bahan.stok / line.qty)  (bahan with stok null/undefined => Infinity).
// Menus without a recipe OR with an empty recipe keep their current stock.
//
// IMPORTANT: this module is PURE (no side effects). The caller must
// apply the resulting stock deltas through the single stock door
// (api.applyStock / applyStockDelta) and persist bahan baku via
// api.saveBahanBaku so there is never a double-deduction or split state.

// clamped integer stock floor; guards NaN/Infinity/负数.
function safeFloor(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

// producibleQty(menu, resepLines, bahanList) -> number
// Returns how many FULL portions this menu can produce from current
// bahan baku stock. A menu with no recipe lines is treated as
// unlimited (returns Infinity) so the caller can skip it.
export function producibleQty(menu, resepLines, bahanList) {
  if (!Array.isArray(resepLines) || resepLines.length === 0) return Infinity;
  const bahanMap = new Map(
    (Array.isArray(bahanList) ? bahanList : []).map((b) => [String(b?.id || "").trim(), b])
  );
  let limit = Infinity;
  for (const line of resepLines) {
    const id = String(line?.bahanId || "").trim();
    const qty = Number(line?.qty || 0);
    if (!id || qty <= 0) continue;
    const b = bahanMap.get(id);
    if (!b) { limit = 0; break; } // bahan hilang -> tidak bisa produksi
    const stock = b.stok === null || b.stok === undefined ? Infinity : Number(b.stok);
    if (!Number.isFinite(stock)) { limit = 0; break; }
    const portions = Math.floor(stock / qty);
    if (portions < limit) limit = portions;
  }
  return limit;
}
