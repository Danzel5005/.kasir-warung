import { describe, it, expect } from "vitest";
import {
  baseUnit,
  findUnit,
  unitOptions,
  stockQty,
  tierPrice,
  resolveLine,
  cartKeyFor,
} from "./units.js";
import { calcPrice } from "./calculations.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Item "modern": punya satuan tambahan dus (factor 24) dan tier harga.
const TEH = {
  id: "m1",
  nama: "Teh Kotak",
  harga: 5000,
  modal: 3500,
  satuan: "pcs",
  stok: 100,
  units: [
    { key: "dus", label: "Dus", factor: 24, harga: 4800, modal: 3300 },
    { key: "pack", label: "Pack", factor: 6, harga: 4900 },
  ],
  priceTiers: [
    { minQty: 12, harga: 4700 },
    { minQty: 48, harga: 4500 },
  ],
};

// Item lama: tidak punya units / priceTiers sama sekali.
const KOPI = { id: "m2", nama: "Kopi Sachet", harga: 2000, modal: 1200, stok: 50 };

// Item tanpa modal.
const ROTI = { id: "m3", nama: "Roti", harga: 8000, stok: 10, units: [{ key: "dus", label: "Dus", factor: 10, harga: 75000 }] };

// ---------------------------------------------------------------------------
// baseUnit / findUnit / unitOptions
// ---------------------------------------------------------------------------

describe("units.js: satuan dasar & pencarian unit", () => {
  it("baseUnit memakai item.satuan dan factor 1", () => {
    const b = baseUnit(TEH);
    expect(b.key).toBe("");
    expect(b.label).toBe("pcs");
    expect(b.factor).toBe(1);
    expect(b.harga).toBe(5000);
    expect(b.modal).toBe(3500);
  });

  it("baseUnit item tanpa satuan tetap aman", () => {
    const b = baseUnit(KOPI);
    expect(b.key).toBe("");
    expect(b.label).toBe("");
    expect(b.factor).toBe(1);
    expect(b.harga).toBe(2000);
  });

  it("findUnit mengembalikan unit berdasar key", () => {
    expect(findUnit(TEH, "dus").factor).toBe(24);
    expect(findUnit(TEH, "pack").label).toBe("Pack");
  });

  it("findUnit null untuk key kosong / tidak ada / item tanpa units", () => {
    expect(findUnit(TEH, "")).toBe(null);
    expect(findUnit(TEH, "nope")).toBe(null);
    expect(findUnit(KOPI, "dus")).toBe(null);
    expect(findUnit(null, "dus")).toBe(null);
  });

  it("unitOptions item lama hanya satuan dasar", () => {
    const opts = unitOptions(KOPI);
    expect(opts).toHaveLength(1);
    expect(opts[0].factor).toBe(1);
  });

  it("unitOptions item modern = dasar + units", () => {
    const opts = unitOptions(TEH);
    expect(opts.map((o) => o.key)).toEqual(["", "dus", "pack"]);
  });
});

// ---------------------------------------------------------------------------
// stockQty — konversi ke satuan dasar
// ---------------------------------------------------------------------------

describe("units.js: stockQty (konversi ke satuan dasar)", () => {
  it("item tanpa unit → qty apa adanya", () => {
    expect(stockQty({ ...KOPI, qty: 3 })).toBe(3);
  });

  it("satuan non-dasar → qty dikali factor", () => {
    expect(stockQty({ ...TEH, qty: 2, unit: "dus" })).toBe(48);
    expect(stockQty({ ...TEH, qty: 3, unit: "pack" })).toBe(18);
  });

  it("satuan dasar item modern → factor 1", () => {
    expect(stockQty({ ...TEH, qty: 5, unit: "" })).toBe(5);
  });

  it("unit key tak dikenal → dianggap factor 1 (aman)", () => {
    expect(stockQty({ ...TEH, qty: 4, unit: "ghost" })).toBe(4);
  });

  it("qty/unit bisa di-override lewat argumen", () => {
    expect(stockQty(TEH, 2, "dus")).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// tierPrice — batas tier (boundary)
// ---------------------------------------------------------------------------

describe("units.js: tierPrice batas tier", () => {
  it("tidak ada tier → null", () => {
    expect(tierPrice(KOPI, 100)).toBe(null);
    expect(tierPrice({ ...TEH, priceTiers: [] }, 100)).toBe(null);
  });

  it("di bawah minQty terkecil → null (pakai harga dasar)", () => {
    expect(tierPrice(TEH, 11)).toBe(null);
  });

  it("tepat di minQty → tier aktif (batas inklusif)", () => {
    expect(tierPrice(TEH, 12)).toBe(4700);
    expect(tierPrice(TEH, 48)).toBe(4500);
  });

  it("di antara dua tier → tier yang lebih rendah (minQty terbesar yang lolos)", () => {
    expect(tierPrice(TEH, 13)).toBe(4700);
    expect(tierPrice(TEH, 47)).toBe(4700);
  });

  it("di atas tier tertinggi → tier tertinggi", () => {
    expect(tierPrice(TEH, 999)).toBe(4500);
  });

  it("daftar tier tidak urut tetap benar", () => {
    const scrambled = { ...TEH, priceTiers: [{ minQty: 48, harga: 4500 }, { minQty: 12, harga: 4700 }] };
    expect(tierPrice(scrambled, 12)).toBe(4700);
    expect(tierPrice(scrambled, 60)).toBe(4500);
  });

  it("tier dengan minQty <= 0 diabaikan", () => {
    const bad = { ...TEH, priceTiers: [{ minQty: 0, harga: 1 }] };
    expect(tierPrice(bad, 100)).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// resolveLine — inti
// ---------------------------------------------------------------------------

describe("units.js: resolveLine", () => {
  it("item lama tanpa units → perilaku tidak berubah", () => {
    const r = resolveLine(KOPI, null, 4);
    expect(r.unit.key).toBe("");
    expect(r.unit.factor).toBe(1);
    expect(r.harga).toBe(2000);
    expect(r.baseQty).toBe(4);
    expect(r.tierHarga).toBe(null);
    expect(r.subtotal).toBe(8000);
  });

  it("satuan dasar item modern + tier dihitung dari baseQty", () => {
    const r = resolveLine(TEH, "", 12);
    expect(r.baseQty).toBe(12);
    expect(r.tierHarga).toBe(4700);
    expect(r.harga).toBe(4700);
    expect(r.subtotal).toBe(56400);
  });

  it("satuan dasar di bawah tier → harga dasar", () => {
    const r = resolveLine(TEH, "", 5);
    expect(r.harga).toBe(5000);
    expect(r.tierHarga).toBe(null);
  });

  it("satuan non-dasar TIDAK kena tier, harga per satuan dasar tetap", () => {
    const r = resolveLine(TEH, "dus", 2);
    expect(r.unit.key).toBe("dus");
    expect(r.unit.factor).toBe(24);
    // harga yang dipakai perhitungan baris selalu harga satuan dasar
    expect(r.harga).toBe(5000);
    expect(r.tierHarga).toBe(null);
    expect(r.baseQty).toBe(48);
    expect(r.subtotal).toBe(5000 * 48);
  });

  it("1 dus = 24 dasar, sehingga tier 48 aktif lewat satuan dasar lain-lain", () => {
    // 2 dus = baseQty 48 → kalau tier dilihat pada satuan dasar, 48 lolos
    const asBase = resolveLine(TEH, "", 48);
    expect(asBase.tierHarga).toBe(4500);
  });

  it("modal selalu modal SATUAN DASAR (modal baris = modal dasar x baseQty)", () => {
    // Konsep: `modal` yang dikembalikan adalah modal per satuan dasar sehingga
    // modal baris = modal * baseQty. Satuan non-dasar tetap memakai modal dasar.
    const r = resolveLine(TEH, "dus", 1);
    expect(r.modal).toBe(3500);
    expect(r.baseQty).toBe(24);
    expect(r.modal * r.baseQty).toBe(84000); // modal 1 dus
    const r2 = resolveLine(TEH, "pack", 1);
    expect(r2.modal).toBe(3500);
  });

  it("modal null kalau item tidak punya modal sama sekali", () => {
    const r = resolveLine(ROTI, "", 1);
    expect(r.modal).toBe(null);
    const r2 = resolveLine(ROTI, "dus", 1);
    expect(r2.modal).toBe(null);
  });

  it("qty default dari item.qty", () => {
    const r = resolveLine({ ...KOPI, qty: 7 });
    expect(r.baseQty).toBe(7);
  });

  it("input rusak (null/undefined) tidak melempar", () => {
    const r = resolveLine(null, null, 3);
    expect(r.harga).toBe(0);
    expect(r.baseQty).toBe(3);
    expect(r.unit.factor).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// cartKeyFor
// ---------------------------------------------------------------------------

describe("units.js: cartKeyFor", () => {
  it("satuan dasar → id polos (kompatibel data lama)", () => {
    expect(cartKeyFor("m1", "")).toBe("m1");
    expect(cartKeyFor("m1", null)).toBe("m1");
  });

  it("satuan lain → id@unitKey", () => {
    expect(cartKeyFor("m1", "dus")).toBe("m1@dus");
  });
});

// ---------------------------------------------------------------------------
// Integrasi dengan calcPrice (hanya import) — harga tier + diskon
// ---------------------------------------------------------------------------

describe("units.js: integrasi calcPrice dengan harga tier + diskon", () => {
  it("subtotal baris memakai harga tier, diskon membaca harga baris", () => {
    const r = resolveLine(TEH, "", 12);
    // Baris keranjang: qty disimpan dalam satuan dasar agar konsisten
    const line = { id: TEH.id, nama: TEH.nama, harga: r.harga, qty: r.baseQty };
    const subtotal = line.harga * line.qty;
    expect(subtotal).toBe(56400);

    const { discount, total } = calcPrice(subtotal, {
      discounts: [{ type: "percentage", value: 10, scope: "item", target: TEH.id }],
      pajak: { enabled: false, value: 0 },
      service: { enabled: false, value: 0 },
      items: [line],
    });
    expect(discount).toBe(5640);
    expect(total).toBe(56400 - 5640);
  });
});
