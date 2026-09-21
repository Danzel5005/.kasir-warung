// cashflow.js — analitik cash flow lanjutan (Fase 1, fitur "Cash Flow Lanjutan").
//
// Semua fungsi di sini MURNI: hanya membaca transaksi + pengeluaran shift yang
// sudah tersimpan. Tidak menyentuh storage, tidak butuh dependensi baru.
// Flag: advancedFeatures.cashFlow.
import { isVoided } from "./utils.js";

// Rangkum arus kas dari daftar transaksi & daftar shift (yang punya .expenses).
// trxList: transaksi pendapatan (sudah difilter/di-load oleh ViewLaporan).
// shiftList: shift terpilih; tiap shift punya expenses: [{ kategori, jumlah, ... }].
// labelExpense(key): pemetaan kategori pengeluaran -> label human friendly.
// labelIncome(key): pemetaan metode bayar -> label human friendly.
export function buildCashFlow(trxList = [], shiftList = [], labelExpense = (k) => String(k || "lainnya"), labelIncome = (k) => String(k || "cash")) {
  const income = Array.isArray(trxList) ? trxList.filter((t) => !isVoided(t)) : [];
  const paidOf = (t) => { const total = Number(t?.total || 0); const bayar = t?.bayar ?? t?.paid; const paid = bayar == null ? total : Number(bayar); return Math.max(0, Math.min(paid, total)); };
  const grossIncome = income.reduce((sum, t) => sum + paidOf(t), 0);

  // Pemasukan per sumber: gabungkan metode bayar dari transaksi.
  const incomeMap = new Map();
  for (const t of income) {
    const key = String(t?.metodeBayar || "cash").trim() || "cash";
    const entry = incomeMap.get(key) || { key, label: labelIncome(key), total: 0, count: 0 };
    entry.total += paidOf(t);
    entry.count += 1;
    incomeMap.set(key, entry);
  }
  const incomeBySource = [...incomeMap.values()].sort((a, b) => b.total - a.total);

  // Pengeluaran per sumber: gabungkan dari seluruh shift terpilih.
  const shifts = Array.isArray(shiftList) ? shiftList : [];
  const expenseMap = new Map();
  let totalExpense = 0;
  for (const shift of shifts) {
    const expenses = Array.isArray(shift?.expenses) ? shift.expenses : [];
    for (const item of expenses) {
      const amount = Number(item?.jumlah || item?.amount || 0);
      if (!amount) continue;
      const key = String(item?.kategori || item?.category || "lainnya").trim() || "lainnya";
      const entry = expenseMap.get(key) || { key, label: labelExpense(key), total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      expenseMap.set(key, entry);
      totalExpense += amount;
    }
  }
  const expenseBySource = [...expenseMap.values()].sort((a, b) => b.total - a.total);

  // Piutang (buku hutang): transaksi tunai yang dibayar kurang dari total.
  // Sisa = total - bayar; pelanggan masih berutang sebesar itu.
  const debtMap = new Map();
  for (const t of income) {
    const total = Number(t?.total || 0);
    const bayar = Number(t?.bayar ?? t?.paid ?? total);
    const due = Math.max(0, total - bayar);
    if (due <= 0) continue;
    const name = String(t?.customerNama || t?.customer || "Pelanggan Umum").trim() || "Pelanggan Umum";
    const entry = debtMap.get(name) || { name, total: 0, count: 0, lastDate: "" };
    entry.total += due;
    entry.count += 1;
    const stamp = String(t?.tanggal || t?.date || t?.timestamp || "");
    if (stamp && stamp > entry.lastDate) entry.lastDate = stamp;
    debtMap.set(name, entry);
  }
  const debts = [...debtMap.values()].sort((a, b) => b.total - a.total);
  const outstanding = debts.reduce((sum, d) => sum + d.total, 0);

  const netProfit = grossIncome - totalExpense;

  return {
    hasData: income.length > 0 || shifts.length > 0,
    grossIncome,
    totalExpense,
    netProfit,
    margin: grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0,
    incomeBySource,
    expenseBySource,
    debts,
    outstanding,
  };
}

