import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  isTracked,
  getStockAlerts,
  suggestedReorder,
  buildRestockList,
  salesVelocity,
} from "./stock.js";

const menu = [
  { id: 1, nama: "Kopi Hitam", kategori: "kopi", stok: 0 },
  { id: 2, nama: "Teh Manis", kategori: "teh", stok: 2 },
  { id: 3, nama: "Es Jeruk", kategori: "non-kopi", stok: 5 },
  { id: 4, nama: "Roti Bakar", kategori: "snack", stok: 40 },
  { id: 5, nama: "Air Mineral", kategori: "non-kopi", stok: null },
  { id: 6, nama: "Indomie", kategori: "indomie" }, // stok undefined → untracked
];

describe("stock.js - thresholds & tracking", () => {
  it("defaults to a threshold of 5", () => {
    expect(DEFAULT_LOW_STOCK_THRESHOLD).toBe(5);
  });

  it("treats null/undefined stock as untracked", () => {
    expect(isTracked({ stok: null })).toBe(false);
    expect(isTracked({ stok: undefined })).toBe(false);
    expect(isTracked({})).toBe(false);
  });

  it("treats numeric stock (including 0) as tracked", () => {
    expect(isTracked({ stok: 0 })).toBe(true);
    expect(isTracked({ stok: 12 })).toBe(true);
  });

  it("ignores non-numeric junk values", () => {
    expect(isTracked({ stok: "abc" })).toBe(false);
    expect(isTracked({ stok: NaN })).toBe(false);
  });
});

describe("stock.js - getStockAlerts", () => {
  const alerts = getStockAlerts(menu);

  it("splits items into out / low / tracked / untracked buckets", () => {
    expect(alerts.out.map((i) => i.id)).toEqual([1]);
    expect(alerts.low.map((i) => i.id)).toEqual([2, 3]);
    expect(alerts.untracked).toBe(2); // Air Mineral (null) + Indomie (undefined)
    expect(alerts.tracked).toBe(4);
    expect(alerts.total).toBe(3); // out + low
  });

  it("sorts each bucket by ascending stock", () => {
    expect(alerts.low.map((i) => i.stok)).toEqual([2, 5]);
  });

  it("never flags untracked items as low or out", () => {
    const ids = [...alerts.out, ...alerts.low].map((i) => i.id);
    expect(ids).not.toContain(5);
    expect(ids).not.toContain(6);
  });

  it("honours a custom threshold", () => {
    const loose = getStockAlerts(menu, 50);
    expect(loose.low.map((i) => i.id)).toEqual([2, 3, 4]);
    const tight = getStockAlerts(menu, 1);
    expect(tight.low).toHaveLength(0);
    expect(tight.out.map((i) => i.id)).toEqual([1]);
  });

  it("survives a non-array menu", () => {
    expect(getStockAlerts(null).total).toBe(0);
    expect(getStockAlerts(undefined).out).toEqual([]);
  });

  it("reports the threshold it used", () => {
    expect(getStockAlerts(menu, 9).threshold).toBe(9);
    expect(getStockAlerts(menu).threshold).toBe(DEFAULT_LOW_STOCK_THRESHOLD);
  });

  it("never counts untracked items as tracked", () => {
    const a = getStockAlerts(menu);
    expect(a.tracked + a.untracked).toBe(menu.length);
  });
});

describe("stock.js - suggestedReorder", () => {
  it("tops up to three times the threshold", () => {
    expect(suggestedReorder({ stok: 0 }, 5)).toBe(15);
    expect(suggestedReorder({ stok: 2 }, 5)).toBe(13);
    expect(suggestedReorder({ stok: 5 }, 5)).toBe(10);
  });

  it("always suggests at least 1 unit", () => {
    expect(suggestedReorder({ stok: 999 }, 5)).toBe(1);
  });

  it("works with a small threshold", () => {
    expect(suggestedReorder({ stok: 0 }, 1)).toBe(3);
  });
});

describe("stock.js - buildRestockList", () => {
  const rows = buildRestockList(menu);

  it("returns one row per flagged item, worst first", () => {
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("labels the level and carries the suggested quantity", () => {
    expect(rows[0]).toMatchObject({ id: 1, level: "out", suggestQty: 15 });
    expect(rows[1]).toMatchObject({ id: 2, level: "low", suggestQty: 13 });
    expect(rows[2]).toMatchObject({ id: 3, level: "low", suggestQty: 10 });
  });

  it("preserves the display fields needed by the panel", () => {
    expect(rows[0].nama).toBe("Kopi Hitam");
    expect(rows[0].kategori).toBe("kopi");
    expect(rows[0].id).toBe(1);
    expect(rows[0].menuId).toBeUndefined(); // source item has no menuId
    expect(rows[0].stok).toBe(0);
  });

  it("returns an empty list when nothing is low", () => {
    expect(buildRestockList([{ id: 1, nama: "X", stok: 99 }])).toEqual([]);
  });
});

describe("stock.js - salesVelocity", () => {
  const trx = [
    {
      id: "T1",
      status: "lunas",
      items: [
        { nama: "Kopi Hitam", qty: 3 },
        { nama: "Teh Manis", qty: 1 },
      ],
    },
    {
      id: "T2",
      status: "voided",
      voided: true,
      items: [{ nama: "Kopi Hitam", qty: 99 }],
    },
    {
      id: "T3",
      items: [{ nama: "Kopi Hitam", qty: 2 }],
    },
  ];

  it("returns one row per menu item with the units sold", () => {
    const v = salesVelocity(trx, menu);
    expect(v).toHaveLength(menu.length);
    expect(v[0]).toMatchObject({ id: 1, nama: "Kopi Hitam", sold: 5 }); // 3 + 2
    expect(v[1]).toMatchObject({ id: 2, nama: "Teh Manis", sold: 1 });
  });

  it("excludes voided transactions from velocity", () => {
    const onlyVoid = [{ id: "V", status: "voided", items: [{ nama: "Kopi Hitam", qty: 50 }] }];
    const v = salesVelocity(onlyVoid, menu);
    expect(v[0].sold).toBe(0);
  });

  it("reports 0 for menu items with no sales", () => {
    const v = salesVelocity([], menu);
    expect(v.every((r) => r.sold === 0)).toBe(true);
  });

  it("survives malformed input", () => {
    expect(salesVelocity(null, menu).every((r) => r.sold === 0)).toBe(true);
    expect(salesVelocity([{ id: "X" }], menu).every((r) => r.sold === 0)).toBe(true);
  });
});
