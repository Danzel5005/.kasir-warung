import { describe, expect, it } from "vitest";
import {
  normKey,
  validateMenuRows,
  validateBahanRows,
  validateResepRows,
  buildResolvers,
  buildImportPlan,
  mergeResep,
  mergeBahan,
  parseImportWorkbook,
  ROW_NEW,
  ROW_CONFLICT,
  ROW_ERROR,
} from "./excelImport.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EXISTING_CATS = [
  { key: "kopi", label: "Kopi" },
  { key: "non-kopi", label: "Non Kopi" },
];

const EXISTING_MENU = [
  { id: "c_1", menuId: "kopi_susu", nama: "Kopi Susu", kategori: "kopi", harga: 18000, modal: 7000, stok: 12, satuan: "gelas", units: [{ key: "l", label: "Liter", factor: 10 }], priceTiers: [{ minQty: 5, harga: 15000 }] },
  { id: "c_2", nama: "Es Teh", kategori: "non-kopi", harga: 6000, modal: 2000, stok: null, satuan: "gelas" },
];

const EXISTING_BAHAN = [
  { id: "bahan_1", nama: "Kopi Bubuk", satuan: "gram", hargaSatuan: 120, stok: 500, minStok: 100 },
  { id: "bahan_2", nama: "Susu", satuan: "ml", hargaSatuan: 18, stok: 1000, minStok: 200 },
];

// Helper bikin baris mentah ala sheet_to_json.
const rowMenu = (o) => ({ nama: "", kategori: "", harga: "", menuId: "", modal: "", stok: "", satuan: "", ...o });
const rowBahan = (o) => ({ namaBahan: "", satuan: "", hargaSatuan: "", stok: "", minStok: "", ...o });
const rowResep = (o) => ({ menuId: "", namaBahan: "", qty: "", ...o });

// ---------------------------------------------------------------------------
// normKey
// ---------------------------------------------------------------------------
describe("normKey", () => {
  it("trim, lowercase, rapatkan spasi", () => {
    expect(normKey("  Kopi   Susu ")).toBe("kopi susu");
    expect(normKey(null)).toBe("");
    expect(normKey(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// validateMenuRows
// ---------------------------------------------------------------------------
describe("validateMenuRows", () => {
  it("baris valid tanpa menuId -> NEW, kategori existing", () => {
    const { rows, newCategories } = validateMenuRows(
      [rowMenu({ nama: "Latte", kategori: "Kopi", harga: 20000 })],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_NEW);
    expect(rows[0].categoryAction).toBe("existing");
    expect(rows[0].data.kategori).toBe("kopi"); // dipetakan ke key existing
    expect(newCategories).toHaveLength(0);
  });

  it("kategori tak dikenal -> kategori BARU dibuat, bukan error", () => {
    const { rows, newCategories, errors } = validateMenuRows(
      [rowMenu({ nama: "Matcha", kategori: "Matcha Series", harga: 23000 })],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(errors).toHaveLength(0);
    expect(rows[0].status).toBe(ROW_NEW);
    expect(rows[0].categoryAction).toBe("create");
    expect(newCategories).toHaveLength(1);
    expect(newCategories[0].label).toBe("Matcha Series");
    expect(rows[0].data.kategori).toBe(newCategories[0].key);
  });

  it("beberapa baris dengan kategori baru yang sama -> hanya satu kategori dibuat", () => {
    const { newCategories, rows } = validateMenuRows(
      [
        rowMenu({ nama: "Matcha Latte", kategori: "Matcha", harga: 23000 }),
        rowMenu({ nama: "Matcha Es", kategori: "matcha", harga: 24000 }),
      ],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(newCategories).toHaveLength(1);
    expect(rows[0].data.kategori).toBe(rows[1].data.kategori); // key sama
  });

  it("harga <= 0 -> ERROR, tidak ikut commit", () => {
    const { rows } = validateMenuRows(
      [
        rowMenu({ nama: "Gratis", kategori: "Kopi", harga: 0 }),
        rowMenu({ nama: "Minus", kategori: "Kopi", harga: -5 }),
      ],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_ERROR);
    expect(rows[1].status).toBe(ROW_ERROR);
    expect(rows[0].errors.join()).toContain("Harga");
  });

  it("nama kosong -> ERROR", () => {
    const { rows } = validateMenuRows([rowMenu({ nama: "  ", kategori: "Kopi", harga: 1000 })], EXISTING_MENU, EXISTING_CATS);
    expect(rows[0].status).toBe(ROW_ERROR);
  });

  it("kategori kosong -> ERROR", () => {
    const { rows } = validateMenuRows([rowMenu({ nama: "X", kategori: "", harga: 1000 })], EXISTING_MENU, EXISTING_CATS);
    expect(rows[0].status).toBe(ROW_ERROR);
  });

  it("menuId yang sudah ada -> CONFLICT, menyertakan data existing", () => {
    const { rows } = validateMenuRows(
      [rowMenu({ menuId: "kopi_susu", nama: "Kopi Susu", kategori: "Kopi", harga: 19000 })],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_CONFLICT);
    expect(rows[0].existing.id).toBe("c_1");
    expect(rows[0].data.harga).toBe(19000);
  });

  it("nama menu existing tanpa menuId -> CONFLICT lewat pencocokan nama", () => {
    const { rows } = validateMenuRows(
      [rowMenu({ nama: "  es teh ", kategori: "Non Kopi", harga: 7000 })],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_CONFLICT);
    expect(rows[0].existing.id).toBe("c_2");
  });

  it("dua baris id sama di dalam file -> baris kedua ERROR", () => {
    const { rows } = validateMenuRows(
      [
        rowMenu({ menuId: "dup", nama: "A", kategori: "Kopi", harga: 1000 }),
        rowMenu({ menuId: "dup", nama: "B", kategori: "Kopi", harga: 2000 }),
      ],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_NEW);
    expect(rows[1].status).toBe(ROW_ERROR);
    expect(rows[1].errors.join()).toContain("duplikat");
  });

  it("toleran nama header beda (menu_id / Category / Price)", () => {
    const { rows } = validateMenuRows(
      [{ "menu_id": "kopi_susu", Nama: "Kopi Susu", Category: "Kopi", Price: 20000 }],
      EXISTING_MENU,
      EXISTING_CATS
    );
    expect(rows[0].status).toBe(ROW_CONFLICT);
    expect(rows[0].data.harga).toBe(20000);
  });
});

// ---------------------------------------------------------------------------
// validateBahanRows
// ---------------------------------------------------------------------------
describe("validateBahanRows", () => {
  it("bahan baru -> NEW dengan id digenerate", () => {
    const { rows } = validateBahanRows([rowBahan({ namaBahan: "Gula", satuan: "gram", hargaSatuan: 15, stok: 300, minStok: 50 })], EXISTING_BAHAN);
    expect(rows[0].status).toBe(ROW_NEW);
    expect(rows[0].data.id).toMatch(/^bahan_/);
    expect(rows[0].data.hargaSatuan).toBe(15);
  });

  it("nama bahan sama (case-insensitive) -> CONFLICT, id existing dipakai", () => {
    const { rows } = validateBahanRows([rowBahan({ namaBahan: "susu", satuan: "ml", hargaSatuan: 20, stok: 800, minStok: 200 })], EXISTING_BAHAN);
    expect(rows[0].status).toBe(ROW_CONFLICT);
    expect(rows[0].data.id).toBe("bahan_2");
  });

  it("hargaSatuan kosong -> ERROR", () => {
    const { rows } = validateBahanRows([rowBahan({ namaBahan: "X", hargaSatuan: "" })], EXISTING_BAHAN);
    expect(rows[0].status).toBe(ROW_ERROR);
  });

  it("stok/minStok kosong -> default 0", () => {
    const { rows } = validateBahanRows([rowBahan({ namaBahan: "Baru", hargaSatuan: 5 })], EXISTING_BAHAN);
    expect(rows[0].data.stok).toBe(0);
    expect(rows[0].data.minStok).toBe(0);
  });

  it("nama duplikat dalam satu file -> baris kedua ERROR", () => {
    const { rows } = validateBahanRows(
      [rowBahan({ namaBahan: "Gula", hargaSatuan: 10 }), rowBahan({ namaBahan: " gula ", hargaSatuan: 12 })],
      EXISTING_BAHAN
    );
    expect(rows[0].status).toBe(ROW_NEW);
    expect(rows[1].status).toBe(ROW_ERROR);
  });
});

// ---------------------------------------------------------------------------
// buildResolvers + validateResepRows
// ---------------------------------------------------------------------------
describe("resolvers & resep", () => {
  function resolvers(menuRows, bahanRows) {
    const vm = validateMenuRows(menuRows, EXISTING_MENU, EXISTING_CATS);
    const vb = validateBahanRows(bahanRows, EXISTING_BAHAN);
    return buildResolvers(vm, vb, EXISTING_MENU, EXISTING_BAHAN);
  }

  it("resolve menu dari baris import (nama) dan dari existing (menuId)", () => {
    const { menuMap } = resolvers([rowMenu({ nama: "Matcha", kategori: "Matcha", harga: 20000 })], []);
    expect(menuMap.get(normKey("Matcha")).source).toBe("import");
    expect(menuMap.get(normKey("kopi_susu")).source).toBe("existing");
    expect(menuMap.get(normKey("Es Teh")).source).toBe("existing");
  });

  it("resolve bahan dari import dan existing", () => {
    const { bahanMap } = resolvers([], [rowBahan({ namaBahan: "Gula", hargaSatuan: 10 })]);
    expect(bahanMap.get(normKey("Gula")).source).toBe("import");
    expect(bahanMap.get(normKey("Kopi Bubuk")).source).toBe("existing");
  });

  it("baris resep valid -> NEW dengan id ter-resolve", () => {
    const { menuMap, bahanMap } = resolvers([rowMenu({ nama: "Matcha", kategori: "Matcha", harga: 20000 })], [rowBahan({ namaBahan: "Gula", hargaSatuan: 10 })]);
    const { rows } = validateResepRows(
      [rowResep({ menuId: "Matcha", namaBahan: "Gula", qty: 20 }), rowResep({ menuId: "kopi_susu", namaBahan: "Susu", qty: 100 })],
      menuMap,
      bahanMap
    );
    expect(rows.every((r) => r.status === ROW_NEW)).toBe(true);
    expect(rows[0].data.menuId).toBe(menuMap.get(normKey("Matcha")).id);
    expect(rows[1].data.menuId).toBe("c_1");
  });

  it("menu tak ditemukan -> ERROR", () => {
    const { menuMap, bahanMap } = resolvers([], []);
    const { rows } = validateResepRows([rowResep({ menuId: "Menu Hantu", namaBahan: "Susu", qty: 1 })], menuMap, bahanMap);
    expect(rows[0].status).toBe(ROW_ERROR);
    expect(rows[0].errors.join()).toContain("tidak ditemukan");
  });

  it("qty <= 0 -> ERROR", () => {
    const { menuMap, bahanMap } = resolvers([], []);
    const { rows } = validateResepRows([rowResep({ menuId: "kopi_susu", namaBahan: "Susu", qty: 0 })], menuMap, bahanMap);
    expect(rows[0].status).toBe(ROW_ERROR);
  });

  it("satu menu banyak bahan (banyak baris) semuanya lolos", () => {
    const { menuMap, bahanMap } = resolvers([], []);
    const { rows } = validateResepRows(
      [
        rowResep({ menuId: "kopi_susu", namaBahan: "Kopi Bubuk", qty: 15 }),
        rowResep({ menuId: "kopi_susu", namaBahan: "Susu", qty: 100 }),
      ],
      menuMap,
      bahanMap
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.data.menuId === "c_1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildImportPlan
// ---------------------------------------------------------------------------
describe("buildImportPlan", () => {
  function plan(menuRows, bahanRows, resepRows, decisions = {}) {
    const vm = validateMenuRows(menuRows, EXISTING_MENU, EXISTING_CATS);
    const vb = validateBahanRows(bahanRows, EXISTING_BAHAN);
    const { menuMap, bahanMap } = buildResolvers(vm, vb, EXISTING_MENU, EXISTING_BAHAN);
    const vr = validateResepRows(resepRows, menuMap, bahanMap);
    return { vm, vb, vr, result: buildImportPlan(vm, vb, vr, decisions) };
  }

  it("baris baru langsung masuk plan tanpa keputusan", () => {
    const { result } = plan([rowMenu({ nama: "Latte", kategori: "Kopi", harga: 20000 })], [], []);
    expect(result.hasPendingDecisions).toBe(false);
    expect(result.menuToUpsert).toHaveLength(1);
    expect(result.menuToUpsert[0].nama).toBe("Latte");
  });

  it("konflik tanpa keputusan -> pending, belum masuk plan", () => {
    const { result } = plan([rowMenu({ menuId: "kopi_susu", nama: "Kopi Susu", kategori: "Kopi", harga: 19000 })], [], []);
    expect(result.hasPendingDecisions).toBe(true);
    expect(result.pendingCount).toBe(1);
    expect(result.menuToUpsert).toHaveLength(0);
  });

  it('keputusan "keep" -> tidak di-upsert, dihitung sebagai kept', () => {
    const { result } = plan(
      [rowMenu({ menuId: "kopi_susu", nama: "Kopi Susu", kategori: "Kopi", harga: 19000 })],
      [],
      [],
      { menu: { 0: "keep" } }
    );
    expect(result.hasPendingDecisions).toBe(false);
    expect(result.menuToUpsert).toHaveLength(0);
    expect(result.stats.menuKept).toBe(1);
  });

  it('keputusan "overwrite" -> upsert, tapi STOK & units/priceTiers lama dipertahankan', () => {
    const { result } = plan(
      [rowMenu({ menuId: "kopi_susu", nama: "Kopi Susu Baru", kategori: "Kopi", harga: 19000, stok: 999 })],
      [],
      [],
      { menu: { 0: "overwrite" } }
    );
    expect(result.menuToUpsert).toHaveLength(1);
    const item = result.menuToUpsert[0];
    expect(item.harga).toBe(19000);
    expect(item.nama).toBe("Kopi Susu Baru");
    expect(item.stok).toBe(12); // stok lama, bukan 999
    expect(item.units).toHaveLength(1); // field di luar template dipertahankan
    expect(item.priceTiers).toHaveLength(1);
  });

  it("menu baru dengan resep -> modal diabaikan", () => {
    const { result } = plan(
      [rowMenu({ nama: "Matcha", kategori: "Matcha", harga: 20000, modal: 8000 })],
      [rowBahan({ namaBahan: "Gula", hargaSatuan: 10 })],
      [rowResep({ menuId: "Matcha", namaBahan: "Gula", qty: 20 })]
    );
    const item = result.menuToUpsert.find((m) => m.nama === "Matcha");
    expect(item.modal).toBeUndefined();
    expect(Object.keys(result.resepToSet)).toHaveLength(1);
    expect(result.stats.menusWithResep).toBe(1);
  });

  it("menu baru TANPA resep -> modal dari Excel dipakai", () => {
    const { result } = plan([rowMenu({ nama: "Teh Manis", kategori: "Non Kopi", harga: 5000, modal: 1500 })], [], []);
    expect(result.menuToUpsert[0].modal).toBe(1500);
  });

  it("kategori baru ikut masuk newCategories plan", () => {
    const { result } = plan([rowMenu({ nama: "Matcha", kategori: "Matcha Series", harga: 20000 })], [], []);
    expect(result.newCategories).toHaveLength(1);
    expect(result.newCategories[0].label).toBe("Matcha Series");
  });

  it("stok menu BARU dipertahankan (insert baru set stok apa adanya)", () => {
    const { result } = plan([rowMenu({ nama: "Baru", kategori: "Kopi", harga: 10000, stok: 25 })], [], []);
    expect(result.menuToUpsert[0].stok).toBe(25);
  });

  it("bahan konflik butuh keputusan terpisah dari menu", () => {
    const { result } = plan([], [rowBahan({ namaBahan: "Susu", hargaSatuan: 25, stok: 900 })], []);
    expect(result.hasPendingDecisions).toBe(true);
    const { result: r2 } = plan([], [rowBahan({ namaBahan: "Susu", hargaSatuan: 25, stok: 900 })], [], { bahan: { 0: "overwrite" } });
    expect(r2.bahanToUpsert).toHaveLength(1);
    expect(r2.bahanToUpsert[0].hargaSatuan).toBe(25);
    expect(r2.bahanToUpsert[0].id).toBe("bahan_2");
  });

  it("stats menghitung new/conflict/error dengan benar", () => {
    const { result } = plan(
      [
        rowMenu({ nama: "A", kategori: "Kopi", harga: 1000 }),
        rowMenu({ menuId: "kopi_susu", nama: "Kopi Susu", kategori: "Kopi", harga: 19000 }),
        rowMenu({ nama: "Bad", kategori: "Kopi", harga: 0 }),
      ],
      [],
      []
    );
    expect(result.stats.menuNew).toBe(1);
    expect(result.stats.menuConflict).toBe(1);
    expect(result.stats.menuError).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// mergeResep / mergeBahan
// ---------------------------------------------------------------------------
describe("merge helpers", () => {
  it("mergeResep mengganti baris menu yang sama, tidak menambah", () => {
    const existing = { c_1: [{ bahanId: "bahan_1", qty: 10 }], c_2: [{ bahanId: "bahan_2", qty: 5 }] };
    const next = mergeResep(existing, { c_1: [{ bahanId: "bahan_2", qty: 20 }] });
    expect(next.c_1).toEqual([{ bahanId: "bahan_2", qty: 20 }]);
    expect(next.c_2).toEqual([{ bahanId: "bahan_2", qty: 5 }]); // tidak tersentuh
  });

  it("mergeBahan menggabung by id tanpa duplikat", () => {
    const next = mergeBahan(EXISTING_BAHAN, [{ id: "bahan_2", nama: "Susu", hargaSatuan: 25 }, { id: "bahan_3", nama: "Gula" }]);
    expect(next).toHaveLength(3);
    expect(next.find((b) => b.id === "bahan_2").hargaSatuan).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// parseImportWorkbook (round-trip nyata lewat XLSX)
// ---------------------------------------------------------------------------
describe("parseImportWorkbook", () => {
  it("membaca 3 sheet dan mengembalikan baris mentah", async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ nama: "Latte", kategori: "Kopi", harga: 20000 }]), "Menu");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ namaBahan: "Gula", hargaSatuan: 10 }]), "BahanBaku");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ menuId: "x", namaBahan: "Gula", qty: 5 }]), "Resep");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const parsed = await parseImportWorkbook(buf);
    expect(parsed.menuRows).toHaveLength(1);
    expect(parsed.bahanRows).toHaveLength(1);
    expect(parsed.resepRows).toHaveLength(1);
    expect(parsed.foundSheets).toContain("Menu");
  });

  it("sheet opsional tidak ada -> array kosong, tidak throw", async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ nama: "Latte", kategori: "Kopi", harga: 20000 }]), "Menu");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const parsed = await parseImportWorkbook(buf);
    expect(parsed.menuRows).toHaveLength(1);
    expect(parsed.bahanRows).toHaveLength(0);
    expect(parsed.resepRows).toHaveLength(0);
  });
});
