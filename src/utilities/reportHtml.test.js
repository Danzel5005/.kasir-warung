import { describe, it, expect } from "vitest";
import { buildReportHTML, escapeHtml, rupiah } from "./reportHtml.js";

describe("reportHtml", () => {
  it("escapeHtml menetralkan tag berbahaya", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("rupiah memformat angka dengan pemisah ribuan", () => {
    expect(rupiah(1234567)).toBe("Rp 1.234.567");
    expect(rupiah(0)).toBe("Rp 0");
    expect(rupiah(undefined)).toBe("Rp 0");
  });

  it("menghasilkan dokumen HTML A4 yang valid", () => {
    const html = buildReportHTML({
      warungName: "Warung A",
      shiftLabel: "Semua Shift",
      rev: 100000,
      mod: 40000,
      sub: 100000,
      netProfit: 50000,
      totalExpenses: 10000,
      hasModal: true,
      showCost: true,
      transactions: [{}, {}],
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("size: A4");
    expect(html).toContain("Warung A");
    expect(html).toContain("Total Modal");
    expect(html).toContain("Laba Bersih");
    expect(html).toContain("Rp 100.000");
    expect(html).toContain("2 transaksi");
  });

  it("menyembunyikan modal & laba ketika showCost false", () => {
    const html = buildReportHTML({ warungName: "W", showCost: false, hasModal: true });
    expect(html).not.toContain("Total Modal");
    expect(html).not.toContain("Laba Bersih");
    expect(html).toContain("Total Pendapatan");
  });

  it("menampilkan bagian analitik saat insights tersedia", () => {
    const html = buildReportHTML({
      warungName: "W",
      insights: {
        hasData: true,
        busiest: { hour: 19, count: 5 },
        average: { average: 25000 },
        mix: [{ key: "cash", label: "Tunai", count: 3, revenue: 90000 }],
        top: [{ nama: "Kopi", qty: 10, revenue: 50000 }],
      },
    });
    expect(html).toContain("Analitik Penjualan");
    expect(html).toContain("19:00");
    expect(html).toContain("Tunai");
    expect(html).toContain("Kopi");
  });

  it("melewatkan analitik ketika hasData false", () => {
    const html = buildReportHTML({ warungName: "W", insights: { hasData: false } });
    expect(html).not.toContain("Analitik Penjualan");
  });
});
