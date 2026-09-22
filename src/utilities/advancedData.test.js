import { describe, it, expect } from "vitest";

import { hppFromResep, hppForMenus, marginFromResep, bahanDeltasFromItems } from "./resepHpp.js";
import {
  DEFAULT_BAHAN_BAKU,
  normalizeBahan,
  lowStockBahan,
  totalNilaiBahan,
  applyBahanDelta,
} from "./bahanBaku.js";
import {
  DEFAULT_SUPPLIER,
  normalizeSupplier,
  findSupplier,
  supplierLabel,
} from "./supplier.js";
import {
  DEFAULT_LOYALTY_TIERS,
  normalizeLoyaltyTiers,
  tierForTotal,
  tierDiscount,
} from "./loyalty.js";

const bahan = [
  { id: "b1", nama: "Kopi", satuan: "gram", stok: 1000, minStok: 100, hargaSatuan: 0.5 },
  { id: "b2", nama: "Gula", satuan: "gram", stok: 500, minStok: 100, hargaSatuan: 0.2 },
  { id: "b3", nama: "Susu", satuan: "ml", stok: 200, minStok: 50, hargaSatuan: 1 },
];

describe("resepHpp.js", () => {
  it("computes HPP from recipe lines and unit prices", () => {
    const resep = [
      { bahanId: "b1", qty: 20 },
      { bahanId: "b2", qty: 10 },
    ];
    const { hpp, missing } = hppFromResep(resep, bahan);
    // 20*0.5 + 10*0.2 = 12 -> rounded
    expect(hpp).toBe(12);
    expect(missing).toEqual([]);
  });

  it("rounds HPP to nearest integer", () => {
    const resep = [{ bahanId: "b1", qty: 21 }]; // 10.5 -> 11
    expect(hppFromResep(resep, bahan).hpp).toBe(11);
  });

  it("reports missing bahan ids and skips them", () => {
    const resep = [
      { bahanId: "b1", qty: 10 },
      { bahanId: "ghost", qty: 5 },
    ];
    const { hpp, missing } = hppFromResep(resep, bahan);
    expect(hpp).toBe(5);
    expect(missing).toEqual(["ghost"]);
  });

  it("ignores invalid lines (empty id or non-positive qty)", () => {
    const resep = [
      { bahanId: "", qty: 5 },
      { bahanId: "b1", qty: 0 },
      { bahanId: "b1", qty: -3 },
      { bahanId: "b1", qty: 10 },
    ];
    expect(hppFromResep(resep, bahan).hpp).toBe(5);
  });

  it("returns zero for empty/null input", () => {
    expect(hppFromResep([], bahan).hpp).toBe(0);
    expect(hppFromResep(null, null).hpp).toBe(0);
  });

  it("hppForMenus maps each menu id", () => {
    const resepMap = {
      m1: [{ bahanId: "b1", qty: 10 }], // 5
      m2: [{ bahanId: "b2", qty: 50 }], // 10
    };
    const out = hppForMenus(resepMap, bahan);
    expect(out.m1.hpp).toBe(5);
    expect(out.m2.hpp).toBe(10);
  });

  it("marginFromResep computes profit and margin pct", () => {
    const resep = [{ bahanId: "b1", qty: 20 }]; // hpp 10
    const r = marginFromResep(25, resep, bahan);
    expect(r.hpp).toBe(10);
    expect(r.profit).toBe(15);
    expect(r.marginPct).toBe(0.6); // fraction 15/25
  });

  it("marginFromResep guards zero selling price", () => {
    const r = marginFromResep(0, [{ bahanId: "b1", qty: 20 }], bahan);
    expect(r.marginPct).toBe(0);
  });

  describe("bahanDeltasFromItems", () => {
    const resepMap = {
      m1: [{ bahanId: "b1", qty: 20 }, { bahanId: "b2", qty: 10 }],
      m2: [{ bahanId: "b2", qty: 5 }],
    };

    it("converts sold menu qty into negative bahan deltas (default sign)", () => {
      const d = bahanDeltasFromItems([{ id: "m1", qty: 2 }], resepMap);
      expect(d).toEqual({ b1: -40, b2: -20 });
    });

    it("aggregates across multiple items and shared bahan", () => {
      const d = bahanDeltasFromItems(
        [{ id: "m1", qty: 1 }, { id: "m2", qty: 4 }],
        resepMap
      );
      // b1: -20 ; b2: -10 + (4*5=-20) = -30
      expect(d).toEqual({ b1: -20, b2: -30 });
    });

    it("restores stock with sign +1", () => {
      const d = bahanDeltasFromItems([{ id: "m1", qty: 2 }], resepMap, 1);
      expect(d).toEqual({ b1: 40, b2: 20 });
    });

    it("prefers baseQty over qty", () => {
      const d = bahanDeltasFromItems([{ id: "m1", qty: 999, baseQty: 1 }], resepMap);
      expect(d).toEqual({ b1: -20, b2: -10 });
    });

    it("skips items without a recipe, zero qty, and unknown menus", () => {
      const d = bahanDeltasFromItems(
        [{ id: "nope", qty: 5 }, { id: "m1", qty: 0 }, { qty: 3 }],
        resepMap
      );
      expect(d).toEqual({});
    });

    it("guards null/invalid inputs", () => {
      expect(bahanDeltasFromItems(null, resepMap)).toEqual({});
      expect(bahanDeltasFromItems([{ id: "m1", qty: 1 }], null)).toEqual({});
    });
  });
});

describe("bahanBaku.js", () => {
  it("normalizes entries with defaults", () => {
    const b = normalizeBahan({ id: "x", nama: "  Tepung  ", stok: "3" });
    expect(b.nama).toBe("Tepung");
    expect(b.stok).toBe(3);
    expect(b.minStok).toBe(0);
    expect(b.hargaSatuan).toBe(0);
    expect(b.supplierId).toBe("");
  });

  it("DEFAULT_BAHAN_BAKU is empty array", () => {
    expect(DEFAULT_BAHAN_BAKU).toEqual([]);
  });

  it("lowStockBahan flags items at/below minStok with a name", () => {
    const list = [
      { id: "1", nama: "A", stok: 5, minStok: 10 }, // low
      { id: "2", nama: "B", stok: 10, minStok: 10 }, // equal -> low
      { id: "3", nama: "C", stok: 20, minStok: 10 }, // ok
      { id: "4", nama: "", stok: 0, minStok: 5 }, // no name -> skip
      { id: "5", nama: "D", stok: 0, minStok: 0 }, // minStok 0 -> skip
    ];
    const low = lowStockBahan(list).map((b) => b.id);
    expect(low).toEqual(["1", "2"]);
  });

  it("totalNilaiBahan sums stok * hargaSatuan", () => {
    const v = totalNilaiBahan([
      { stok: 10, hargaSatuan: 2 },
      { stok: 5, hargaSatuan: 3 },
    ]);
    expect(v).toBe(35);
  });

  describe("applyBahanDelta", () => {
    const list = [
      { id: "b1", nama: "Kopi", stok: 100 },
      { id: "b2", nama: "Gula", stok: 5 },
    ];

    it("applies negative and positive deltas", () => {
      const { list: out, changed } = applyBahanDelta(list, { b1: -30, b2: 10 });
      expect(changed).toBe(true);
      expect(out.find((b) => b.id === "b1").stok).toBe(70);
      expect(out.find((b) => b.id === "b2").stok).toBe(15);
    });

    it("clamps stock at zero", () => {
      const { list: out } = applyBahanDelta(list, { b2: -50 });
      expect(out.find((b) => b.id === "b2").stok).toBe(0);
    });

    it("reports changed=false when nothing actually changes", () => {
      const zero = [{ id: "b1", nama: "K", stok: 0 }];
      const { changed } = applyBahanDelta(zero, { b1: -10 }); // already 0
      expect(changed).toBe(false);
      const { changed: c2 } = applyBahanDelta(list, { ghost: -5 });
      expect(c2).toBe(false);
    });

    it("does not mutate the original list", () => {
      applyBahanDelta(list, { b1: -10 });
      expect(list.find((b) => b.id === "b1").stok).toBe(100);
    });
  });
});

describe("supplier.js", () => {
  it("normalizes supplier fields", () => {
    const s = normalizeSupplier({ id: "s1", nama: "  PT Kopi ", telepon: 812 });
    expect(s.nama).toBe("PT Kopi");
    expect(s.telepon).toBe("812");
    expect(s.kontak).toBe("");
  });

  it("findSupplier locates by id, returns null when missing", () => {
    const list = [{ id: "s1", nama: "A" }];
    expect(findSupplier(list, "s1").nama).toBe("A");
    expect(findSupplier(list, "zzz")).toBeNull();
    expect(findSupplier(list, "")).toBeNull();
  });

  it("supplierLabel returns name or dash", () => {
    const list = [{ id: "s1", nama: "A" }];
    expect(supplierLabel(list, "s1")).toBe("A");
    expect(supplierLabel(list, "zzz")).toBe("-");
  });

  it("DEFAULT_SUPPLIER is empty array", () => {
    expect(DEFAULT_SUPPLIER).toEqual([]);
  });
});

describe("loyalty.js", () => {
  it("provides four default tiers sorted ascending", () => {
    expect(DEFAULT_LOYALTY_TIERS.map((t) => t.key)).toEqual([
      "bronze",
      "silver",
      "gold",
      "platinum",
    ]);
  });

  it("normalizeLoyaltyTiers falls back to defaults for empty/invalid", () => {
    expect(normalizeLoyaltyTiers([])).toEqual(DEFAULT_LOYALTY_TIERS);
    expect(normalizeLoyaltyTiers(null)).toEqual(DEFAULT_LOYALTY_TIERS);
  });

  it("normalizeLoyaltyTiers coerces and sorts custom tiers", () => {
    const out = normalizeLoyaltyTiers([
      { label: "Gold", min: "2000", discountPct: "5" },
      { label: "Silver", min: "500", discountPct: "2" },
    ]);
    expect(out.map((t) => t.min)).toEqual([500, 2000]);
    expect(out[0].key).toBe("silver");
    expect(out[1].discountPct).toBe(5);
  });

  it("tierForTotal picks highest tier whose min <= total", () => {
    expect(tierForTotal(0).key).toBe("bronze");
    expect(tierForTotal(499999).key).toBe("bronze");
    expect(tierForTotal(500000).key).toBe("silver");
    expect(tierForTotal(3000000).key).toBe("gold");
    expect(tierForTotal(9999999).key).toBe("platinum");
  });

  it("tierDiscount returns tier, pct, and rounded amount", () => {
    const d = tierDiscount(1000000); // silver 2%
    expect(d.tier.key).toBe("silver");
    expect(d.pct).toBe(2);
    expect(d.amount).toBe(20000);
  });

  it("tierDiscount handles zero total", () => {
    const d = tierDiscount(0);
    expect(d.amount).toBe(0);
  });
});
