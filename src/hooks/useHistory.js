import { useState, useMemo, useCallback } from "react";
import { api } from "../utilities/utils.js";

// useHistory — transaksi history, filter tanggal, group per hari (memo),
// collapse-by-day UI state, delete + undo, dan CSV download generic.
// Juga mendukung view mode per shift (shiftIdFilter).
function useHistory({ toast_, addUndo, getNow }) {
  const [history, setHistory] = useState([]);
  const [fFrom, setFFrom]     = useState("");
  const [fTo, setFTo]         = useState("");
  // hari mana yang di-expand — null = belum diinisialisasi (default: hari
  // pertama/terbaru expand, sisanya collapsed). Lihat Lag_Fix.md Tahap 1.3.
  const [expandedDays, setExpandedDays] = useState(null);

  // ── Filter mode: "day" (default) atau "shift"
  const [viewMode, setViewMode] = useState("day");
  const [shiftIdFilter, setShiftIdFilter] = useState(null);

  // Generate TRX ID in format: TRX-ddmmyyN where N is sequential for the day (no space, no parentheses)
  const generateTrxId = useCallback((date = new Date()) => {
    const d = getNow ? getNow() : {
      tgl: String(date.getDate()).padStart(2, "0"),
      blnNum: String(date.getMonth() + 1).padStart(2, "0"),
      thn: String(date.getFullYear())
    };
    const dateStr = `${d.tgl}${d.blnNum}${d.thn.slice(-2)}`;
    // Count transactions for this date
    const count = history.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    }).length + 1;
    return `TRX-${dateStr}${count}`;
  }, [history, getNow]);

  // deps kosong aman: hanya setter, tidak baca state apapun.
  const loadInitial = useCallback((savedTrx) => {
    const list = savedTrx || [];
    setHistory(list);
  }, []);

  const sortedHistory = useMemo(() => [...history].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return tb - ta;
  }), [history]);

  // memo: target utama fix lag — 300+ item, jangan filter+reduce ulang tiap render
  const filteredHistory = useMemo(() => sortedHistory.filter(t => {
    if (!fFrom && !fTo) return true;
    const d = new Date(t.timestamp);
    if (fFrom && d < new Date(fFrom)) return false;
    if (fTo && d > new Date(fTo + "T23:59:59")) return false;
    return true;
  }), [sortedHistory, fFrom, fTo]);

  const histByDay = useMemo(() => filteredHistory.reduce((acc, t) => {
    const k = `${t.hari}, ${t.tgl} ${t.bln} ${t.thn}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {}), [filteredHistory]);

  // ── Shift-based filtering & grouping
  // filtered by shift ID (null = all)
  const filteredByShift = useMemo(() => {
    if (!shiftIdFilter) return filteredHistory;
    return filteredHistory.filter(t => t.shiftId === shiftIdFilter);
  }, [filteredHistory, shiftIdFilter]);

  // Group trx by shift ID — used when viewMode === "shift"
  // Returns { [shiftLabel]: { shift, trxs } }
  const histByShift = useMemo(() => {
    const base = shiftIdFilter ? filteredByShift : filteredHistory;
    const map = {};
    base.forEach(t => {
      if (!t.shiftId) {
        const k = "Tanpa Shift";
        if (!map[k]) map[k] = { shift: null, trxs: [] };
        map[k].trxs.push(t);
        return;
      }
      const k = t.shiftId;
      if (!map[k]) map[k] = { shift: { id: t.shiftId, shiftNum: t.shiftNum }, trxs: [] };
      map[k].trxs.push(t);
    });
    return map;
  }, [filteredHistory, filteredByShift, shiftIdFilter]);

  // deps kosong aman: pakai functional update setHistory(h=>...), tidak
  // baca `history` langsung dari closure.
  const appendHistory = useCallback((trx) => setHistory(h => [trx, ...h]), []);

  // PENTING: membaca history LANGSUNG dari closure untuk snapshot undo.
  // Wajib [history, addUndo].
  const deleteTrx = useCallback(async (id) => {
    const snap = [...history];
    await api.deleteTrx(id); setHistory(h => h.filter(t => t.id !== id));
    addUndo("Hapus Transaksi", async () => { await api.restoreTrx(snap); setHistory(snap); });
  }, [history, addUndo]);

  // PENTING: sama seperti deleteTrx, baca history langsung. Wajib [history, addUndo].
  const clearAllTrx = useCallback(async () => {
    const snap = [...history];
    await api.clearTrx(); setHistory([]);
    addUndo("Hapus Semua Riwayat", async () => { await api.restoreTrx(snap); setHistory(snap); });
  }, [history, addUndo]);

  // ── CSV (generic — dipakai Riwayat & Laporan)
  // PENTING: memanggil getNow. Wajib [getNow] (getNow stabil — module-level
  // function di App.jsx, tapi tetap disertakan untuk exhaustive-deps).
  const at = useCallback(() => {
    const t = getNow();
    return `${t.hari} ${t.tgl}-${t.bln}-${t.thn} ${t.jam}:${t.mnt}:${t.dtk}`;
  }, [getNow]);

  // PENTING: memanggil getNow dan toast_. Wajib [getNow, toast_].
  const doCSV = useCallback(async (filename, content) => {
    const t = getNow();
    const fn = `${filename}_${t.tgl}-${t.blnNum}-${t.thn}.csv`;
    const res = await api.saveCSV({ filename: fn, content });
    if (res?.ok) toast_(`${filename} disimpan`, "ok"); else toast_("Dibatalkan", "err");
  }, [getNow, toast_]);

  return {
    history, fFrom, fTo, expandedDays,
    filteredHistory, histByDay,
    viewMode, shiftIdFilter, histByShift,
    generateTrxId, setFFrom, setFTo, setExpandedDays,
    setViewMode, setShiftIdFilter,
    loadInitial, appendHistory, deleteTrx, clearAllTrx, at, doCSV,
  };
}

export { useHistory };
