import { describe, expect, it } from "vitest";
import { buildCashFlow } from "./cashflow.js";

// Transaksi minimal, bentuk sama seperti dari useCart.processPayment.
const trx = (over = {}) => ({
  id: "T1",
  total: 20000,
  bayar: over.bayar ?? over.total ?? 20000,
  metodeBayar: "cash",
  customerNama: "",
  tanggal: "2026-01-01T10:00:00.000Z",
  items: [{ nama: "Kopi", qty: 1, harga: 20000 }],
  ...over,
});

const shift = (expenses = []) => ({ id: "S1", expenses });

describe("cashflow.buildCashFlow", () => {
  it("resolves income labels via labelIncome resolver", () => {
    const labelOf = (k) => (k === "cash" ? "Tunai" : k);
    const result = buildCashFlow([trx({ total: 30000 })], [], (k) => k, labelOf);
    expect(result.incomeBySource[0].label).toBe("Tunai");
    expect(result.incomeBySource[0].key).toBe("cash");
    expect(result.grossIncome).toBe(30000);
  });

  it("computes margin as a percentage", () => {
    const result = buildCashFlow(
      [trx({ total: 100000 })],
      [shift([{ kategori: "belanja", jumlah: 25000 }])],
      (k) => k.toUpperCase()
    );
    expect(result.netProfit).toBe(75000);
    expect(result.margin).toBe(75);
    expect(result.totalExpense).toBe(25000);
    expect(result.expenseBySource[0].label).toBe("BELANJA");
  });

  it("builds debts from cash underpayment", () => {
    const result = buildCashFlow(
      [
        trx({ id: "A", total: 50000, bayar: 20000, customerNama: "Budi" }),
        trx({ id: "B", total: 30000, bayar: 15000, customerNama: "Budi" }),
        trx({ id: "C", total: 40000, bayar: 40000, customerNama: "Siti" }),
      ],
      [],
      (k) => k
    );
    expect(result.debts.length).toBe(1);
    expect(result.debts[0].name).toBe("Budi");
    expect(result.debts[0].total).toBe(45000);
    expect(result.debts[0].count).toBe(2);
    expect(result.outstanding).toBe(45000);
  });

  it("labels generic customers without a name", () => {
    const result = buildCashFlow([trx({ total: 10000, bayar: 0, customerNama: "" })], [], (k) => k);
    expect(result.debts[0].name).toBe("Pelanggan Umum");
    expect(result.outstanding).toBe(10000);
  });

  it("reports no data for empty inputs", () => {
    const result = buildCashFlow([], [], (k) => k);
    expect(result.hasData).toBe(false);
    expect(result.margin).toBe(0);
    expect(result.debts).toEqual([]);
    expect(result.outstanding).toBe(0);
  });
it("counts only paid amount as income for underpayment", () => {
    const result = buildCashFlow([
      trx({ id: "A", total: 100000, bayar: 50000, customerNama: "Budi" }),
    ], [], (k) => k);
    expect(result.grossIncome).toBe(50000);
    expect(result.outstanding).toBe(50000);
    expect(result.incomeBySource[0].total).toBe(50000);
  });

it("does not count cash change as income", () => {
    const result = buildCashFlow([
      trx({ id: "A", total: 90000, bayar: 100000, customerNama: "Budi" }),
    ], [], (k) => k);
    expect(result.grossIncome).toBe(90000);
    expect(result.outstanding).toBe(0);
  });

it("income becomes full total after debt settled", () => {
    const result = buildCashFlow([
      trx({ id: "A", total: 100000, bayar: 100000, settled: true, customerNama: "Budi" }),
    ], [], (k) => k);
    expect(result.grossIncome).toBe(100000);
    expect(result.outstanding).toBe(0);
  });

  it("buckets income and expense per hour", () => {
    const result = buildCashFlow(
      [trx({ id: "A", total: 20000, jam: "10" }), trx({ id: "B", total: 5000, jam: "14" })],
      [shift([{ kategori: "belanja", jumlah: 8000, jam: "10" }])],
      (k) => k
    );
    expect(result.hourly.length).toBe(2);
    const h10 = result.hourly.find((b) => b.hour === 10);
    const h14 = result.hourly.find((b) => b.hour === 14);
    expect(h10.income).toBe(20000);
    expect(h10.expense).toBe(8000);
    expect(h10.profit).toBe(12000);
    expect(h10.label).toBe("10:00");
    expect(h14.income).toBe(5000);
    expect(h14.profit).toBe(5000);
  });

  it("derives hour from createdAt when jam is missing", () => {
    const iso = "2026-01-01T09:15:00.000Z";
    const expectedHour = new Date(iso).getHours();
    const result = buildCashFlow(
      [trx({ id: "A", total: 15000, jam: undefined, createdAt: iso, tanggal: undefined })],
      [],
      (k) => k
    );
    expect(result.hourly.length).toBe(1);
    expect(result.hourly[0].hour).toBe(expectedHour);
    expect(result.hourly[0].income).toBe(15000);
  });

  it("returns hourly buckets sorted ascending by hour", () => {
    const result = buildCashFlow(
      [trx({ id: "A", jam: "18" }), trx({ id: "B", jam: "08" }), trx({ id: "C", jam: "12" })],
      [],
      (k) => k
    );
    expect(result.hourly.map((b) => b.hour)).toEqual([8, 12, 18]);
  });

  it("skips records without a readable hour", () => {
    const result = buildCashFlow(
      [trx({ id: "A", jam: undefined, createdAt: undefined, tanggal: undefined })],
      [],
      (k) => k
    );
    expect(result.hourly).toEqual([]);
  });

  it("buckets income per day and reports spanDays", () => {
    const result = buildCashFlow(
      [
        trx({ id: "A", total: 10000, tanggal: "2026-01-01T10:00:00" }),
        trx({ id: "B", total: 20000, tanggal: "2026-01-02T10:00:00" }),
        trx({ id: "C", total: 5000, tanggal: "2026-01-02T15:00:00" }),
      ],
      [],
      (k) => k
    );
    expect(result.spanDays).toBe(2);
    expect(result.daily.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-02"]);
    expect(result.daily[0].income).toBe(10000);
    expect(result.daily[1].income).toBe(25000);
    expect(result.daily[0].label).toBe("1 Jan");
    expect(result.daily[1].label).toBe("2 Jan");
  });

  it("separates the same clock hour on different days into distinct buckets", () => {
    const result = buildCashFlow(
      [
        trx({ id: "A", total: 10000, jam: "09", tanggal: "2026-01-01T09:00:00" }),
        trx({ id: "B", total: 7000, jam: "09", tanggal: "2026-01-08T09:00:00" }),
      ],
      [],
      (k) => k
    );
    // Jam 09 terkumpul jadi SATU bucket di mode jam (perilaku lama)...
    expect(result.hourly.length).toBe(1);
    expect(result.hourly[0].income).toBe(17000);
    // ...tetapi tetap terpisah PER HARI di mode harian.
    expect(result.daily.length).toBe(2);
    expect(result.daily[0].income).toBe(10000);
    expect(result.daily[1].income).toBe(7000);
  });

  it("attributes expenses to their own day, falling back to the shift day", () => {
    const result = buildCashFlow(
      [trx({ id: "A", total: 50000, tanggal: "2026-01-03T10:00:00" })],
      [{
        id: "S1",
        dateKey: "2026-01-03",
        tanggal: "2026-01-03T08:00:00",
        expenses: [
          { kategori: "belanja", jumlah: 8000, tanggal: "2026-01-04T11:00:00" },
          { kategori: "listrik", jumlah: 2000 },
        ],
      }],
      (k) => k
    );
    const jan3 = result.daily.find((d) => d.date === "2026-01-03");
    const jan4 = result.daily.find((d) => d.date === "2026-01-04");
    expect(jan4.expense).toBe(8000);
    expect(jan4.profit).toBe(-8000);
    expect(jan3.income).toBe(50000);
    expect(jan3.expense).toBe(2000);
    expect(jan3.profit).toBe(48000);
  });

  it("returns daily sorted ascending by date", () => {
    const result = buildCashFlow(
      [
        trx({ id: "A", tanggal: "2026-02-10T10:00:00" }),
        trx({ id: "B", tanggal: "2026-02-01T10:00:00" }),
        trx({ id: "C", tanggal: "2026-02-05T10:00:00" }),
      ],
      [],
      (k) => k
    );
    expect(result.daily.map((d) => d.date)).toEqual(["2026-02-01", "2026-02-05", "2026-02-10"]);
  });

  it("returns empty daily when no record has a readable date", () => {
    const result = buildCashFlow(
      [trx({ id: "A", tanggal: undefined, dateKey: undefined, timestamp: undefined, createdAt: undefined })],
      [],
      (k) => k
    );
    expect(result.daily).toEqual([]);
    expect(result.spanDays).toBe(0);
  });

});
