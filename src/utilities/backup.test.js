import { describe, it, expect } from "vitest";
import { BACKUP_KEYS, BACKUP_FORMAT, validateBackup, backupSummary, describeStore } from "./backup.js";

// Build a full, valid envelope for tests.
const envelope = (stores = {}, extra = {}) => ({
  format: BACKUP_FORMAT,
  version: 1,
  exportedAt: "2026-08-21T10:00:00.000Z",
  data: stores,
  ...extra,
});

describe("BACKUP_KEYS", () => {
  it("covers every persisted store, termasuk data fitur lanjutan", () => {
    expect(BACKUP_KEYS).toEqual(["menu", "categories", "settings", "users", "customers", "qris", "bills", "shifts", "transactions", "logo", "resep", "bahanBaku", "supplier", "loyaltyTiers"]);
  });
});

describe("describeStore", () => {
  it("counts array length", () => {
    expect(describeStore([1, 2, 3])).toBe(3);
    expect(describeStore([])).toBe(0);
  });
  it("counts object keys", () => {
    expect(describeStore({ a: 1, b: 2 })).toBe(2);
    expect(describeStore({})).toBe(0);
  });
  it("treats null/undefined as zero and primitives as one", () => {
    expect(describeStore(null)).toBe(0);
    expect(describeStore(undefined)).toBe(0);
    expect(describeStore("data:image/png;base64,AAA")).toBe(1);
  });
});

describe("validateBackup", () => {
  it("accepts a full envelope and reports counts", () => {
    const r = validateBackup(envelope({ menu: [{ id: 1 }, { id: 2 }], transactions: [{ id: "a" }], settings: { warungName: "X" }, logo: "data:image/png;base64,AA" }));
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
    expect(r.counts.menu).toBe(2);
    expect(r.counts.transactions).toBe(1);
    expect(r.counts.settings).toBe(1);
    expect(r.counts.logo).toBe(1);
    expect(r.total).toBe(5);
    expect(r.empty).toBe(false);
    expect(r.version).toBe(1);
    expect(r.exportedAt).toBe("2026-08-21T10:00:00.000Z");
  });

  it("normalises the returned data to known keys only", () => {
    const r = validateBackup(envelope({ menu: [{ id: 1 }], bogus: [1, 2, 3] }));
    expect(Object.keys(r.data)).toEqual(["menu"]);
    expect(r.data.bogus).toBeUndefined();
  });

  it("accepts a bare map of stores (no envelope)", () => {
    const r = validateBackup({ menu: [{ id: 1 }], users: [] });
    expect(r.ok).toBe(true);
    expect(r.counts.menu).toBe(1);
    expect(r.counts.users).toBe(0);
  });

  it("flags an all-empty backup as empty rather than an error", () => {
    const r = validateBackup(envelope({ menu: [], transactions: [], settings: {} }));
    expect(r.ok).toBe(true);
    expect(r.empty).toBe(true);
    expect(r.total).toBe(0);
    expect(backupSummary(r)).toBe("Backup ini kosong (tidak ada data)");
  });

  it("lists stores that are missing from the file", () => {
    const r = validateBackup(envelope({ menu: [{ id: 1 }] }));
    expect(r.ok).toBe(true);
    expect(r.missing).toHaveLength(BACKUP_KEYS.length - 1);
    expect(r.missing).not.toContain("menu");
  });

  it("rejects null / undefined / primitives / arrays", () => {
    for (const bad of [null, undefined, 42, "text", [1, 2, 3], true]) {
      const r = validateBackup(bad);
      expect(r.ok).toBe(false);
      expect(typeof r.error).toBe("string");
      expect(r.data).toBeNull();
    }
  });

  it("rejects a foreign format stamp", () => {
    const r = validateBackup({ format: "some-other-app", version: 1, data: { menu: [{ id: 1 }] } });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("some-other-app");
  });

  it("rejects a payload with no recognisable store", () => {
    const r = validateBackup(envelope({ unknownA: [1], unknownB: [2] }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain("tidak berisi data");
  });

  it("rejects an envelope whose data is an array", () => {
    const r = validateBackup({ format: BACKUP_FORMAT, data: [1, 2, 3] });
    expect(r.ok).toBe(false);
  });

  it("tolerates a missing version and falls back to 1", () => {
    const r = validateBackup({ format: BACKUP_FORMAT, data: { menu: [{ id: 1 }] } });
    expect(r.ok).toBe(true);
    expect(r.version).toBe(1);
    expect(r.exportedAt).toBeNull();
  });

  it("accepts snake_case exported_at", () => {
    const r = validateBackup({ format: BACKUP_FORMAT, exported_at: "2026-01-01", data: { menu: [1] } });
    expect(r.exportedAt).toBe("2026-01-01");
  });

  it("counts a settings-only backup without calling it empty", () => {
    const r = validateBackup(envelope({ settings: { printerName: "EPSON" } }));
    expect(r.ok).toBe(true);
    expect(r.empty).toBe(false);
    expect(r.total).toBe(1);
  });
});

describe("backupSummary", () => {
  it("describes an invalid result", () => {
    expect(backupSummary(null)).toBe("Backup tidak valid");
    expect(backupSummary({ ok: false })).toBe("Backup tidak valid");
  });

  it("lists only non-zero stores, in canonical order", () => {
    const r = validateBackup(envelope({ menu: [1, 2, 3], transactions: [1], categories: [], users: [1, 2] }));
    const s = backupSummary(r);
    expect(s).toBe("3 menu · 2 pengguna · 1 transaksi");
  });

  it("says empty when only empty stores are present", () => {
    expect(backupSummary(validateBackup(envelope({ users: [] })))).toBe("Backup ini kosong (tidak ada data)");
  });

  it("labels the logo store", () => {
    const s = backupSummary(validateBackup(envelope({ logo: "data:image/png;base64,AA" })));
    expect(s).toBe("1 logo");
  });
});
