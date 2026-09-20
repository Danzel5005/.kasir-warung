import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage and window for Node test environment
const store = new Map();
const localStorageMock = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

globalThis.localStorage = localStorageMock;
if (typeof globalThis.window === "undefined") {
  globalThis.window = globalThis;
}

import { LS, api, isVoided, nonVoided, healVoidedTrx } from "./utils.js";

describe("utils.js - Void helpers", () => {
  describe("isVoided", () => {
    it("detects the current status flag", () => {
      expect(isVoided({ status: "voided" })).toBe(true);
      expect(isVoided({ status: "paid" })).toBe(false);
    });

    it("detects the legacy voided boolean", () => {
      expect(isVoided({ voided: true })).toBe(true);
      expect(isVoided({ voided: false })).toBe(false);
    });

    it("is falsy for null/undefined", () => {
      expect(isVoided(null)).toBe(false);
      expect(isVoided(undefined)).toBe(false);
    });
  });

  describe("nonVoided", () => {
    it("strips voided transactions and keeps the rest", () => {
      const list = [{ id: 1 }, { id: 2, status: "voided" }, { id: 3, voided: true }, { id: 4 }];
      expect(nonVoided(list).map((t) => t.id)).toEqual([1, 4]);
    });

    it("returns an empty array for non-array input", () => {
      expect(nonVoided(null)).toEqual([]);
      expect(nonVoided(undefined)).toEqual([]);
    });
  });

  describe("healVoidedTrx", () => {
    it("leaves non-voided transactions untouched", () => {
      const t = { id: 1, total: 5000 };
      expect(healVoidedTrx(t)).toBe(t);
    });

    it("repairs a clobbered void row by restoring safe defaults", () => {
      const healed = healVoidedTrx({ id: 9, status: "voided", voidReason: "error" });
      expect(healed.voided).toBe(true);
      expect(healed.total).toBe(0);
      expect(healed.subtotal).toBe(0);
      expect(healed.kembalian).toBe(0);
      expect(healed.items).toEqual([]);
      expect(healed.voidReason).toBe("error");
    });

    it("preserves real financial values on a voided row", () => {
      const healed = healVoidedTrx({ id: 9, status: "voided", total: 25000, items: [{ qty: 2 }] });
      expect(healed.total).toBe(25000);
      expect(healed.items).toEqual([{ qty: 2 }]);
    });
  });
});

describe("utils.js - LocalStorage Helper (LS) & API Wrapper", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.kasirAPI;
  });

  describe("LS Helper Function", () => {
    it("should set and get values from localStorage with JSON serialization", () => {
      const sampleData = { name: "Kedai Kopi", id: 123 };
      LS("test_key", sampleData);

      const retrieved = LS("test_key");
      expect(retrieved).toEqual(sampleData);
    });

    it("should return null when getting non-existent key from localStorage", () => {
      const retrieved = LS("non_existent_key");
      expect(retrieved).toBeNull();
    });

    it("should correctly handle primitive values like strings, numbers, booleans", () => {
      LS("str_key", "hello");
      expect(LS("str_key")).toBe("hello");

      LS("num_key", 42);
      expect(LS("num_key")).toBe(42);

      LS("bool_key", true);
      expect(LS("bool_key")).toBe(true);
    });
  });

  describe("API Object - Browser LocalStorage Fallback Mode", () => {
    it("should load empty array for transactions if none saved", async () => {
      const trxs = await api.loadTrx();
      expect(trxs).toEqual([]);
    });

    it("should save and load transactions in localStorage", async () => {
      const trx1 = { id: "TRX-1", total: 50000 };
      await api.saveTrx(trx1);

      const trxs = await api.loadTrx();
      expect(trxs).toHaveLength(1);
      expect(trxs[0]).toEqual(trx1);
    });

    it("should delete transaction by ID", async () => {
      await api.saveTrx({ id: "TRX-1", total: 10000 });
      await api.saveTrx({ id: "TRX-2", total: 20000 });

      await api.deleteTrx("TRX-1");
      const trxs = await api.loadTrx();
      expect(trxs).toHaveLength(1);
      expect(trxs[0].id).toBe("TRX-2");
    });

    it("should restore and clear transactions", async () => {
      await api.restoreTrx([{ id: "TRX-A" }, { id: "TRX-B" }]);
      expect(await api.loadTrx()).toHaveLength(2);

      await api.clearTrx();
      expect(await api.loadTrx()).toEqual([]);
    });

    it("should process payment atomically in browser mode", async () => {
      // Setup active bills and initial menu
      LS("ykk_bills", [{ id: "BILL-1", meja: "01" }, { id: "BILL-2", meja: "02" }]);
      LS("ykk_menu", [{ id: "M1", nama: "Kopi", stok: 10 }]);

      const paymentData = {
        trx: { id: "TRX-NEW", total: 15000, items: [{ id: "M1", nama: "Kopi", qty: 1 }] },
      };

      const result = await api.processPayment(paymentData);
      expect(result.ok).toBe(true);
      expect(result.stock).toEqual({ M1: 9 }); // stok dihitung di fallback (10 - 1)

      const trxs = await api.loadTrx();
      expect(trxs[0].id).toBe("TRX-NEW");

      const menu = await api.loadMenu();
      expect(menu[0].stok).toBe(9);
    });

    it("should load default settings and handle save settings", async () => {
      const defaultSettings = await api.loadSettings();
      expect(defaultSettings).toEqual({});

      await api.saveSettings({ printerName: "Thermal POS" });
      const updated = await api.loadSettings();
      expect(updated).toEqual({ printerName: "Thermal POS" });
    });

    it("should handle QRIS operations in browser mode", async () => {
      expect(await api.loadQris()).toEqual({});

      await api.saveQris({ bca: "qris_bca_data" });
      expect(await api.loadQris()).toEqual({ bca: "qris_bca_data" });

      await api.deleteQris("bca");
      expect(await api.loadQris()).toEqual({});
    });

    it("should return fallback data for printReceipt and getPrinters in browser mode", async () => {
      const printers = await api.getPrinters();
      expect(printers).toEqual([]);

      const printResult = await api.printReceipt({});
      expect(printResult).toEqual({
        ok: false,
        error: "Hanya tersedia di aplikasi desktop",
      });
    });

    it("should return 'localStorage' for getDataPath in browser mode", async () => {
      const path = await api.getDataPath();
      expect(path).toBe("localStorage");
    });
  });

  describe("API Object - Electron window.kasirAPI Delegated Mode", () => {
    let mockKasirAPI;

    beforeEach(() => {
      mockKasirAPI = {
        loadTrx: vi.fn().mockResolvedValue([{ id: "ELEC-1" }]),
        saveTrx: vi.fn().mockResolvedValue({ ok: true }),
        deleteTrx: vi.fn().mockResolvedValue({ ok: true }),
        restoreTrx: vi.fn().mockResolvedValue({ ok: true }),
        clearTrx: vi.fn().mockResolvedValue({ ok: true }),
        processPayment: vi.fn().mockResolvedValue({ ok: true, id: "ELEC-1" }),
        loadMenu: vi.fn().mockResolvedValue([{ id: "M1" }]),
        upsertMenu: vi.fn().mockResolvedValue({ ok: true }),
        deleteMenu: vi.fn().mockResolvedValue({ ok: true }),
        replaceMenu: vi.fn().mockResolvedValue({ ok: true }),
        applyStock: vi.fn().mockResolvedValue({ ok: true, stock: { M1: 4 } }),
        loadSettings: vi.fn().mockResolvedValue({ printDelay: 100 }),
        getDataPath: vi.fn().mockResolvedValue("/app/data"),
        getPrinters: vi.fn().mockResolvedValue([{ name: "POS-58" }]),
        printReceipt: vi.fn().mockResolvedValue({ ok: true }),
      };
      window.kasirAPI = mockKasirAPI;
    });

    it("should forward loadTrx calls to window.kasirAPI", async () => {
      const result = await api.loadTrx();
      expect(mockKasirAPI.loadTrx).toHaveBeenCalled();
      expect(result).toEqual([{ id: "ELEC-1" }]);
    });

    it("should forward processPayment calls to window.kasirAPI", async () => {
      const data = { trx: { id: "ELEC-1" } };
      const res = await api.processPayment(data);
      expect(mockKasirAPI.processPayment).toHaveBeenCalledWith(data);
      expect(res).toEqual({ ok: true, id: "ELEC-1" });
    });

    it("should return desktop path from window.kasirAPI", async () => {
      const path = await api.getDataPath();
      expect(mockKasirAPI.getDataPath).toHaveBeenCalled();
      expect(path).toBe("/app/data");
    });
  });
});
