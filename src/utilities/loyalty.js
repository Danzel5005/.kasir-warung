// loyalty.js — loyalty tier pelanggan (Fase 1, fitur "Loyalty Tier").
//
// Fungsi murni untuk menentukan tier pelanggan dari total belanja kumulatif.
// Ambang tier bisa diatur lewat settings.advancedData.loyaltyTiers, dengan
// default Bronze/Silver/Gold/Platinum.
// Flag: advancedFeatures.loyalty.

export const DEFAULT_LOYALTY_TIERS = [
  { key: "bronze", label: "Bronze", min: 0, discountPct: 0 },
  { key: "silver", label: "Silver", min: 500000, discountPct: 2 },
  { key: "gold", label: "Gold", min: 2000000, discountPct: 5 },
  { key: "platinum", label: "Platinum", min: 5000000, discountPct: 8 },
];

// Tiru normalizeAdvancedFeatures: pertahankan default, timpa yang valid.
export function normalizeLoyaltyTiers(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_LOYALTY_TIERS.map((t) => ({ ...t }));
  }
  const out = input
    .filter((t) => t && typeof t === "object" && String(t.label || "").trim())
    .map((t) => ({
      key: String(t.key || t.label || "").trim().toLowerCase() || "tier",
      label: String(t.label || "").trim(),
      min: Number(t.min || 0),
      discountPct: Number(t.discountPct || 0),
    }))
    .sort((a, b) => a.min - b.min);
  return out.length ? out : DEFAULT_LOYALTY_TIERS.map((t) => ({ ...t }));
}

// Tentukan tier dari total belanja kumulatif (pick tier dengan min <= total).
export function tierForTotal(total = 0, tiers = DEFAULT_LOYALTY_TIERS) {
  const list = normalizeLoyaltyTiers(tiers);
  const value = Number(total || 0);
  let picked = list[0];
  for (const t of list) {
    if (value >= t.min) picked = t;
  }
  return picked;
}

// Hitung diskon nominal dari tier untuk sebuah nilai transaksi.
export function tierDiscount(total = 0, tiers = DEFAULT_LOYALTY_TIERS) {
  const tier = tierForTotal(total, tiers);
  const pct = Number(tier?.discountPct || 0);
  return { tier, pct, amount: Math.round((Number(total || 0) * pct) / 100) };
}
