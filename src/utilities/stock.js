// stock.js — single source of truth for stock levels and low-stock alerting.
//
// Stock model: `item.stok` is a number (units on hand) or `null` meaning
// "unlimited / not tracked". A null stock must never trigger an alert.

import { isVoided } from "./utils.js";

// Default reorder threshold. Items at or below this count are "low".
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const LOW_STOCK_THRESHOLD = {
  // 0 units = out of stock (urgent). >0 and <= threshold = low (warning).
  outOfStock: (item) => item?.stok === 0,
  low: (item, threshold = DEFAULT_LOW_STOCK_THRESHOLD) =>
    typeof item?.stok === "number" && item.stok > 0 && item.stok <= threshold,
  any: (item, threshold = DEFAULT_LOW_STOCK_THRESHOLD) =>
    typeof item?.stok === "number" && item.stok <= threshold,
};

// isTracked — true when the item has a usable, finite stock count.
// NaN and Infinity are typeof "number" but are never valid counts, so guard
// against them explicitly: a corrupt value must not masquerade as a real stock.
const isFiniteCount = (v) => typeof v === "number" && Number.isFinite(v);
const isTracked = (item) => item != null && isFiniteCount(item.stok);

// getStockAlerts — classify every tracked item into out/low buckets.
// Returns { out: Item[], low: Item[], tracked: number, untracked: number }.
function getStockAlerts(menu = [], threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const list = Array.isArray(menu) ? menu : [];
  const out = [];
  const low = [];
  let tracked = 0;
  let untracked = 0;

  for (const item of list) {
    if (!isTracked(item)) { untracked += 1; continue; }
    tracked += 1;
    if (item.stok === 0) out.push(item);
    else if (item.stok <= threshold) low.push(item);
  }

  const byStockAsc = (a, b) => a.stok - b.stok;
  out.sort(byStockAsc);
  low.sort(byStockAsc);

  return { out, low, tracked, untracked, total: out.length + low.length, threshold };
}

// suggestedReorder — simple reorder-point hint for a restock list.
// Suggests topping back up to 3x the threshold, rounded to a sensible minimum.
function suggestedReorder(item, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (!isTracked(item)) return 0;
  const target = Math.max(threshold * 3, threshold + 1);
  return Math.max(target - item.stok, 1);
}

// buildRestockList — one row per item that needs restocking, with the reason
// and a suggested quantity, ready to hand to a purchasing/supplier flow.
function buildRestockList(menu = [], threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const { out, low } = getStockAlerts(menu, threshold);
  return [...out, ...low].map((item) => ({
    id: item.id,
    menuId: item.menuId,
    nama: item.nama,
    kategori: item.kategori,
    stok: item.stok,
    level: item.stok === 0 ? "out" : "low",
    suggestQty: suggestedReorder(item, threshold),
  }));
}

// salesVelocity — units sold per menu name over a set of transactions.
// Voided transactions are excluded so restock hints reflect real demand.
function salesVelocity(transactions = [], menu = []) {
  const qtyByName = {};
  for (const t of Array.isArray(transactions) ? transactions : []) {
    if (isVoided(t)) continue;
    for (const it of t.items || []) {
      if (!it?.nama) continue;
      qtyByName[it.nama] = (qtyByName[it.nama] || 0) + Number(it.qty || 0);
    }
  }
  return menu.map((m) => ({ id: m.id, nama: m.nama, sold: qtyByName[m.nama] || 0 }));
}

export {
  DEFAULT_LOW_STOCK_THRESHOLD,
  LOW_STOCK_THRESHOLD,
  isTracked,
  getStockAlerts,
  suggestedReorder,
  buildRestockList,
  salesVelocity,
};
