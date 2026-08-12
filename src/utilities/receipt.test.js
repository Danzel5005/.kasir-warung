import { describe, it, expect } from "vitest";
import { fmt, fmtNum, buildReceiptHTML, buildPreviewHTML } from "./receipt.js";

describe("receipt.js - Receipt utilities and HTML builders", () => {
  describe("fmt and fmtNum Formatting Helpers", () => {
    it("should format currency with Rp prefix and Indonesian number formatting", () => {
      const formatted = fmt(50000);
      expect(formatted).toMatch(/^Rp\s*50[.,]000/);
    });

    it("should handle 0, null, undefined, and empty string in fmt", () => {
      expect(fmt(0)).toMatch(/^Rp\s*0/);
      expect(fmt(null)).toMatch(/^Rp\s*0/);
      expect(fmt(undefined)).toMatch(/^Rp\s*0/);
      expect(fmt("")).toMatch(/^Rp\s*0/);
    });

    it("should format negative numbers in fmt", () => {
      expect(fmt(-15000)).toMatch(/^-?Rp\s*-?15[.,]000/);
    });

    it("should format raw numbers with fmtNum without Rp prefix", () => {
      expect(fmtNum(1234567)).toMatch(/^1[.,]234[.,]567/);
      expect(fmtNum(0)).toBe("0");
      expect(fmtNum(null)).toBe("0");
      expect(fmtNum(undefined)).toBe("0");
    });
  });

  describe("buildReceiptHTML", () => {
    const mockTrxCash = {
      id: "TRX-101",
      hari: "Senin",
      tgl: "15",
      bln: "Januari",
      thn: "2025",
      jam: "14",
      mnt: "30",
      dtk: "00",
      meja: "05",
      pax: 2,
      metodeBayar: "cash",
      subtotal: 50000,
      bayar: 100000,
      kembalian: 41700,
      items: [
        { nama: "Kopi Susu", harga: 25000, qty: 2 }
      ]
    };

    it("should render full HTML string with transaction details and logo", () => {
      const html = buildReceiptHTML(mockTrxCash, "data:image/png;base64,mocklogo");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<img src="data:image/png;base64,mocklogo" class="logo" />');
      expect(html).toContain("YAN KEDAI KOPI");
      expect(html).toContain("TRX #TRX-101");
      expect(html).toContain("Meja 05");
      expect(html).toContain("2 Pax");
      expect(html).toContain("2x Kopi Susu");
      expect(html).toContain("Bayar");
      expect(html).toContain("Kembalian");
    });

    it("should render correctly without logo and without pax", () => {
      const trxNoPax = { ...mockTrxCash, pax: 0 };
      const html = buildReceiptHTML(trxNoPax, null);
      expect(html).not.toContain('<img src=');
      expect(html).not.toContain("Pax");
      expect(html).toContain("Meja 05 &bull; TRX #TRX-101");
    });

    it("should hide Bayar and Kembalian for non-cash payment methods", () => {
      const trxQris = { ...mockTrxCash, metodeBayar: "qris-bca" };
      const html = buildReceiptHTML(trxQris, null);
      expect(html).not.toContain("<span>Bayar</span>");
      expect(html).not.toContain("<span>Kembalian</span>");
    });
  });

  describe("buildPreviewHTML", () => {
    it("should generate receipt preview HTML with calculated totals", () => {
      const items = [
        { nama: "Espresso", harga: 20000, qty: 1 },
        { nama: "Croissant", harga: 25000, qty: 2 }
      ];
      // Subtotal = 20000 + 50000 = 70000
      const html = buildPreviewHTML("03", 4, items, "logo.png");

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Meja 03");
      expect(html).toContain("4 Pax");
      expect(html).toContain("-- PREVIEW TAGIHAN --");
      expect(html).toContain("1x Espresso");
      expect(html).toContain("2x Croissant");
      expect(html).toContain("Belum lunas — mohon menunggu");
    });

    it("should handle preview with empty items array", () => {
      const html = buildPreviewHTML("12", 0, [], null);
      expect(html).toContain("Meja 12");
      expect(html).not.toContain("Pax");
      expect(html).toContain("-- PREVIEW TAGIHAN --");
    });
  });
});
