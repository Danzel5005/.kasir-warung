// cashflow.js — analitik cash flow lanjutan (Fase 1, fitur "Cash Flow Lanjutan").
//
// Semua fungsi di sini MURNI: hanya membaca transaksi + pengeluaran shift yang
// sudah tersimpan. Tidak menyentuh storage, tidak butuh dependensi baru.
// Flag: advancedFeatures.cashFlow.
import { isVoided } from "./utils.js";

// Jam (0-23) dari sebuah catatan. `jam` adalah string "HH" dari getNow();
// kalau hilang/ tak valid, turunkan dari timestamp/createdAt/tanggal supaya
// data lama tetap terhitung. Return null kalau tidak ada waktu yang bisa dibaca.
function hourOf(record) {
  const j = Number(record?.jam);
  if (Number.isFinite(j) && j >= 0 && j <= 23) return j;
  const raw = record?.timestamp || record?.createdAt || record?.tanggal || record?.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

// Kunci tanggal YYYY-MM-DD (waktu lokal) dari sebuah catatan. Dipakai untuk
// mengelompokkan arus kas per hari ketika sebuah shift berjalan lebih dari
// satu hari (mis. shift lupa ditutup berhari-hari/minggu).
// Prioritas: dateKey -> timestamp -> createdAt -> tanggal -> date.
function dayOf(record) {
  const stamp = record?.dateKey || record?.timestamp || record?.createdAt || record?.tanggal || record?.date;
  if (!stamp) return null;
  const d = new Date(stamp);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Label ringkas tanggal "YYYY-MM-DD" -> "22 Sep". tglFallback dipakai bila
// catatan punya field tgl/bln terpisah (tanpa bisa diparse jadi Date).
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function dayLabel(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(key || "");
  const mi = Number(m[2]) - 1;
  const day = Number(m[3]);
  const mon = MONTHS_SHORT[mi] || m[2];
  return `${day} ${mon}`;
}

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

  // Distribusi per jam (0-23) untuk grafik arus kas: pemasukan, pengeluaran,
  // dan laba (pemasukan - pengeluaran) pada tiap jam. Jam tanpa waktu yang
  // bisa dibaca diabaikan agar sumbu X tetap mencerminkan waktu nyata.
  const hourlyMap = new Map();
  const bucketOf = (hour) => {
    if (!hourlyMap.has(hour)) {
      hourlyMap.set(hour, { hour, label: `${String(hour).padStart(2, "0")}:00`, income: 0, expense: 0, profit: 0 });
    }
    return hourlyMap.get(hour);
  };
  for (const t of income) {
    const h = hourOf(t);
    if (h === null) continue;
    bucketOf(h).income += paidOf(t);
  }
  for (const shift of shifts) {
    const expenses = Array.isArray(shift?.expenses) ? shift.expenses : [];
    for (const item of expenses) {
      const amount = Number(item?.jumlah || item?.amount || 0);
      if (!amount) continue;
      const h = hourOf(item);
      if (h === null) continue;
      bucketOf(h).expense += amount;
    }
  }
  const hourly = [...hourlyMap.values()]
    .sort((a, b) => a.hour - b.hour)
    .map((b) => ({ ...b, profit: b.income - b.expense }));

  // Distribusi per hari (YYYY-MM-DD) untuk rentang panjang: dipakai ketika
  // sebuah shift berjalan lebih dari sehari sehingga sumbu jam tak bermakna.
  const dailyMap = new Map();
  const dayBucket = (key) => {
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { date: key, label: dayLabel(key), income: 0, expense: 0, profit: 0 });
    }
    return dailyMap.get(key);
  };
  for (const t of income) {
    const k = dayOf(t);
    if (!k) continue;
    dayBucket(k).income += paidOf(t);
  }
  for (const shift of shifts) {
    const expenses = Array.isArray(shift?.expenses) ? shift.expenses : [];
    for (const item of expenses) {
      const amount = Number(item?.jumlah || item?.amount || 0);
      if (!amount) continue;
      const k = dayOf(item) || dayOf(shift);
      if (!k) continue;
      dayBucket(k).expense += amount;
    }
  }
  const daily = [...dailyMap.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((b) => ({ ...b, profit: b.income - b.expense }));
  const spanDays = daily.length;

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
    hourly,
    daily,
    spanDays,
  };
}

