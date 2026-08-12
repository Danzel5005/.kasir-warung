import { describe, it, expect } from "vitest";
import {
  csvByDay,
  trxRow,
  TRX_HEADER,
  LAP_HEADER,
  csvLaporan,
  csvSalesRate,
  csvPerMenu,
  csvMetodeBayar,
} from "./csvbuild.js";

describe("csvbuild.js - CSV Generator Utilities", () => {
  const timeDownload = "2025-01-15 10:00:00";

  const sampleTrx1 = {
    id: "TRX-001",
    timestamp: "2025-01-15T10:00:00.000Z",
    hari: "Rabu",
    tgl: "15",
    bln: "Januari",
    thn: "2025",
    jam: "10",
    mnt: "00",
    dtk: "00",
    meja: "01",
    pax: 2,
    metodeBayar: "cash",
    subtotal: 50000,
    total: 58300,
    bayar: 100000,
    kembalian: 41700,
    items: [
      { nama: "Kopi Black", harga: 20000, qty: 1, modal: 8000 },
      { nama: "Roti Bakar", harga: 30000, qty: 1, modal: 12000 },
    ],
  };

  const sampleTrx2 = {
    id: "TRX-002",
    timestamp: "2025-01-15T11:30:00.000Z",
    hari: "Rabu",
    tgl: "15",
    bln: "Januari",
    thn: "2025",
    jam: "11",
    mnt: "30",
    dtk: "00",
    meja: "02",
    pax: 1,
    metodeBayar: "qris-bca",
    subtotal: 20000,
    total: 23320,
    bayar: 23320,
    kembalian: 0,
    items: [{ nama: "Kopi Black", harga: 20000, qty: 1, modal: 8000 }],
  };

  const sampleTrxDay2 = {
    id: "TRX-003",
    timestamp: "2025-01-16T09:00:00.000Z",
    hari: "Kamis",
    tgl: "16",
    bln: "Januari",
    thn: "2025",
    jam: "09",
    mnt: "00",
    dtk: "00",
    meja: "03",
    pax: 3,
    metodeBayar: "transfer-bca",
    subtotal: 100000,
    total: 116600,
    bayar: 116600,
    kembalian: 0,
    items: [{ nama: "Matcha Latte", harga: 50000, qty: 2, modal: 20000 }],
  };

  const mockMenuList = [
    { nama: "Kopi Black", kategori: "Minuman", harga: 20000, modal: 8000 },
    { nama: "Roti Bakar", kategori: "Makanan", harga: 30000, modal: 12000 },
    { nama: "Matcha Latte", kategori: "Minuman", harga: 50000, modal: 20000 },
    { nama: "Teh Manis", kategori: "Minuman", harga: 10000, modal: 3000 },
  ];

  describe("trxRow and csvByDay", () => {
    it("should generate CSV rows for transaction items via trxRow", () => {
      const rows = trxRow(sampleTrx1, timeDownload);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain("TRX-001");
      expect(rows[0]).toContain('"Kopi Black"');
      expect(rows[0]).toContain(timeDownload);
    });

    it("should handle trxRow with missing modal, pax, bayar, or kembalian gracefully", () => {
      const minimalTrx = {
        id: "TRX-MIN",
        timestamp: "2025-01-15T12:00:00.000Z",
        hari: "Rabu",
        tgl: "15",
        bln: "Januari",
        thn: "2025",
        jam: "12",
        mnt: "00",
        dtk: "00",
        meja: "01",
        subtotal: 20000,
        items: [{ nama: "Kopi Plain", harga: 20000, qty: 1 }],
      };
      const rows = trxRow(minimalTrx, timeDownload);
      expect(rows[0]).toContain("cash"); // fallback metode
      expect(rows[0]).toContain(",0,"); // default pax/modal
    });

    it("should group transactions by date and sort chronologically in csvByDay", () => {
      const trxs = [sampleTrxDay2, sampleTrx2, sampleTrx1];
      const result = csvByDay(trxs, TRX_HEADER, trxRow, timeDownload);

      expect(result).toContain("===== Rabu, 15 Januari 2025 =====");
      expect(result).toContain("===== Kamis, 16 Januari 2025 =====");
      // Ensures Rabu section appears before Kamis section due to chronological sorting
      const rabuIndex = result.indexOf("===== Rabu, 15 Januari 2025 =====");
      const kamisIndex = result.indexOf("===== Kamis, 16 Januari 2025 =====");
      expect(rabuIndex).toBeLessThan(kamisIndex);
    });

    it("should return empty string if transactions array is empty in csvByDay", () => {
      const result = csvByDay([], TRX_HEADER, trxRow, timeDownload);
      expect(result).toBe("");
    });
  });

  describe("csvLaporan", () => {
    it("should generate daily report summary CSV including total row and LABA status", () => {
      const csv = csvLaporan([sampleTrx1, sampleTrx2], timeDownload);
      expect(csv).toContain(LAP_HEADER);
      expect(csv).toContain("Rabu");
      expect(csv).toContain("15 Januari 2025");
      expect(csv).toContain("LABA");
      expect(csv).toContain("TOTAL");
    });

    it("should report 'Modal belum diinput' if total modal is 0", () => {
      const noModalTrx = {
        ...sampleTrx1,
        items: [{ nama: "Water", harga: 5000, qty: 1, modal: 0 }],
      };
      const csv = csvLaporan([noModalTrx], timeDownload);
      expect(csv).toContain("Modal belum diinput");
    });

    it("should report 'RUGI' when total cost exceeds total gross income", () => {
      const lossTrx = {
        ...sampleTrx1,
        subtotal: 10000,
        items: [{ nama: "Expensive Item", harga: 10000, qty: 1, modal: 50000 }],
      };
      const csv = csvLaporan([lossTrx], timeDownload);
      expect(csv).toContain("RUGI");
    });

    it("should handle zero pax without divide-by-zero error", () => {
      const zeroPaxTrx = { ...sampleTrx1, pax: 0 };
      const csv = csvLaporan([zeroPaxTrx], timeDownload);
      expect(csv).not.toContain("NaN");
    });
  });

  describe("csvSalesRate", () => {
    it("should structure sales rate CSV into TOP 10, BOTTOM 10, and UNSOLD sections", () => {
      const csv = csvSalesRate([sampleTrx1, sampleTrx2], mockMenuList, timeDownload);
      expect(csv).toContain("TOP 10 MENU TERLAKU");
      expect(csv).toContain("TOP 10 MENU PALING SEDIKIT TERJUAL");
      expect(csv).toContain("MENU BELUM TERJUAL SAMA SEKALI");
      expect(csv).toContain('"Teh Manis"'); // unsold menu item
    });

    it("should process transactions with items not present in default menuList", () => {
      const unknownItemTrx = {
        ...sampleTrx1,
        items: [{ nama: "Custom Cake", harga: 40000, qty: 2, modal: 15000 }],
      };
      const csv = csvSalesRate([unknownItemTrx], mockMenuList, timeDownload);
      expect(csv).toContain('"Custom Cake"');
    });
  });

  describe("csvPerMenu", () => {
    it("should output per-menu performance report with margin calculations", () => {
      const csv = csvPerMenu([sampleTrx1], mockMenuList, timeDownload);
      expect(csv).toContain("Nama Menu,Kategori,Harga Jual");
      expect(csv).toContain('"Kopi Black",Minuman,20000,8000,1,20000,8000,12000');
      expect(csv).toContain('"Teh Manis",Minuman,10000,3000,0,0,0,0,N/A,Belum Terjual');
    });
  });

  describe("csvMetodeBayar", () => {
    it("should summarize payments by method and handle legacy normalized method keys", () => {
      const trxs = [sampleTrx1, sampleTrx2, sampleTrxDay2];
      const csv = csvMetodeBayar(trxs, timeDownload);

      expect(csv).toContain("=== DETAIL PER HARI ===");
      expect(csv).toContain("=== RINGKASAN TOTAL ===");
      expect(csv).toContain("Debit BCA"); // transfer-bca normalized
      expect(csv).toContain("QRIS BCA"); // qris-bca
      expect(csv).toContain("GRAND TOTAL");
    });

    it("should handle empty transaction list in csvMetodeBayar", () => {
      const csv = csvMetodeBayar([], timeDownload);
      expect(csv).toContain("GRAND TOTAL");
      expect(csv).toContain("Semua Metode,0,0");
    });
  });
});
