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

});
