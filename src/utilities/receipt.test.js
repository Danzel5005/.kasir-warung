import { describe, it, expect } from "vitest";
import { fmt, fmtNum, buildReceiptHTML, buildPreviewHTML, DEFAULT_WARUNG, DEFAULT_PAPER_WIDTH_MM } from "./receipt.js";

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
      operator: "Kasir 1",
      warungName: "Warung Test",
      metodeBayar: "cash",
      subtotal: 50000,
      bayar: 100000,
      kembalian: 41700,
      items: [
        { nama: "Kopi Susu", harga: 25000, qty: 2, kategori: "Minuman" }
      ]
    };

    it("should render full HTML string with transaction details and logo", () => {
      const html = buildReceiptHTML(mockTrxCash, "data:image/png;base64,mocklogo", [], {});
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Warung Test");
      expect(html).toContain("TRX-101");
      expect(html).toContain("KASIR");
      expect(html).toContain("METODE");
      expect(html).toContain("2 Minuman Kopi Susu"); // New format: qty Category Name
      expect(html).toContain("Bayar");
      expect(html).toContain("Kembalian");
    });

    it("should use DEFAULT_WARUNG when warungName is not provided", () => {
      const trxNoName = { ...mockTrxCash, warungName: undefined };
      const html = buildReceiptHTML(trxNoName, null, [], {});
      expect(html).toContain(DEFAULT_WARUNG);
    });

    it("should hide Bayar and Kembalian for non-cash payment methods", () => {
      const trxQris = { ...mockTrxCash, metodeBayar: "qris-bca" };
      const html = buildReceiptHTML(trxQris, null, [], {});
      expect(html).not.toContain("<span class=\"k\">Bayar</span>");
      expect(html).not.toContain("<span class=\"k\">Kembalian</span>");
      expect(html).not.toContain(">LUNAS<"); // LUNAS only shown for cash
      expect(html).toContain("<div class=\"payment-note\">____</div>");
    });

    it("should render QRIS image when provided", () => {
      const trxQris = { ...mockTrxCash, metodeBayar: "qris-bca" };
      const qrisImages = { "qris-bca": "data:image/png;base64,qrisimage" };
      const html = buildReceiptHTML(trxQris, null, [], qrisImages);
      expect(html).toContain("data:image/png;base64,qrisimage");
    });

    it("should default @page size to 80mm when paperWidthMm is not provided", () => {
      const html = buildReceiptHTML(mockTrxCash, null, [], {});
      expect(html).toContain("@page{size:80mm auto;margin:0mm;}");
      expect(html).toContain("width:80mm;");
      expect(DEFAULT_PAPER_WIDTH_MM).toBe(80);
    });

    it("should use custom paper width in @page and body width", () => {
      const html = buildReceiptHTML(mockTrxCash, null, [], {}, null, [], "", "", [], 58);
      expect(html).toContain("@page{size:58mm auto;margin:0mm;}");
      expect(html).not.toContain("size:80mm");
    });

    it("should clamp out-of-range paper widths to 30-210mm", () => {
      const htmlSmall = buildReceiptHTML(mockTrxCash, null, [], {}, null, [], "", "", [], 10);
      expect(htmlSmall).toContain("@page{size:30mm auto;margin:0mm;}");
      const htmlBig = buildReceiptHTML(mockTrxCash, null, [], {}, null, [], "", "", [], 999);
      expect(htmlBig).toContain("@page{size:210mm auto;margin:0mm;}");
    });

    it("should fall back to 80mm for invalid paper widths", () => {
      const html = buildReceiptHTML(mockTrxCash, null, [], {}, null, [], "", "", [], "abc");
      expect(html).toContain("@page{size:80mm auto;margin:0mm;}");
    });
  });

  describe("buildPreviewHTML", () => {
    it("should generate receipt preview HTML with calculated totals", () => {
      const items = [
        { nama: "Espresso", harga: 20000, qty: 1, kategori: "Minuman" },
        { nama: "Croissant", harga: 25000, qty: 2, kategori: "Makanan" }
      ];
      const receiptAdditionalValues = {};
      const html = buildPreviewHTML(receiptAdditionalValues, items, "logo.png", [], "Warung Test");

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Warung Test");
      expect(html).not.toContain("-- PREVIEW TAGIHAN --");
      expect(html).toContain("1 Minuman Espresso"); // New format: qty Category Name
      expect(html).toContain("2 Makanan Croissant"); // New format: qty Category Name
      expect(html).toContain("Belum Lunas");
    });

    it("should handle preview with empty items array", () => {
      const html = buildPreviewHTML({}, [], null, [], "Warung Test");
      expect(html).toContain("Warung Test");
      expect(html).not.toContain("Pax");
      expect(html).not.toContain("-- PREVIEW TAGIHAN --");
      expect(html).toContain("Belum Lunas");
    });

    it("should use custom paper width in preview @page size", () => {
      const items = [{ nama: "Teh", harga: 5000, qty: 1, kategori: "Minuman" }];
      const html = buildPreviewHTML({}, items, null, [], "Warung Test", [], "", "", 58);
      expect(html).toContain("@page{size:58mm auto;margin:0mm;}");
    });
  });
});
