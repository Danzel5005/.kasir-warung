import { useState, useMemo, useCallback, useEffect } from "react";
import { api } from "../utilities/utils.js";

// useHistory — transaksi history dengan server-side filtering & pagination untuk skalabilitas
// collapse-by-day UI state, delete + undo, dan CSV download generic.
// Juga mendukung view mode per shift (shiftIdFilter).
function useHistory({ toast_, addUndo, getNow }) {
  // ── State untuk pagination & filtering
  const [history, setHistory] = useState([]);       // current page transactions
  const [totalCount, setTotalCount] = useState(0);  // total matching transactions
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(100);                 // fixed page size
  const [isLoading, setIsLoading] = useState(false);
  
  const [fFrom, setFFrom]     = useState("");
  const [fTo, setFTo]         = useState("");
  const [expandedDays, setExpandedDays] = useState(null);
  const [viewMode, setViewMode] = useState("day");
  const [shiftIdFilter, setShiftIdFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");

  // Generate TRX ID in format: TRX-ddmmyyN where N is sequential for the day
  const generateTrxId = useCallback((date = new Date()) => {
    const d = getNow ? getNow() : {
      tgl: String(date.getDate()).padStart(2, "0"),
      blnNum: String(date.getMonth() + 1).padStart(2, "0"),
      thn: String(date.getFullYear())
    };
    const dateStr = `${d.tgl}${d.blnNum}${d.thn.slice(-2)}`;
    // Count transactions for this date from loaded history
    const count = history.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate.getDate() === date.getDate() &&
             tDate.getMonth() === date.getMonth() &&
             tDate.getFullYear() === date.getFullYear();
    }).length + 1;
    return `TRX-${dateStr}${count}`;
  }, [history, getNow]);

  // ── Core: Load filtered & paginated transactions from backend
  const loadFiltered = useCallback(async (page = 0, filters = {}) => {
    setIsLoading(true);
    try {
      const { fFrom: ff = fFrom, fTo: ft = fTo, shiftId = shiftIdFilter, sort = sortOrder } = filters;
      const result = await api.loadTrxFiltered({
        fFrom: ff,
        fTo: ft,
        shiftId,
        page,
        pageSize,
        sort
      });
      setHistory(result.transactions || []);
      setTotalCount(result.total || 0);
      setCurrentPage(result.page || 0);
    } catch (err) {
      console.error("[useHistory] loadFiltered error:", err);
      setHistory([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [fFrom, fTo, shiftIdFilter, sortOrder, pageSize]);

  // Initial load (backward compatible - loads first page)
  const loadInitial = useCallback((savedTrx) => {
    // If data is passed directly (e.g., from initial load), use it
    if (savedTrx && savedTrx.length) {
      const list = savedTrx;
      setHistory(list.slice(0, pageSize));
      setTotalCount(list.length);
      setCurrentPage(0);
    } else {
      // Otherwise load from backend with current filters
      loadFiltered(0);
    }
  }, [loadFiltered, pageSize]);

  // Load more (next page)
  const loadMore = useCallback(() => {
    if (!isLoading && (currentPage + 1) * pageSize < totalCount) {
      loadFiltered(currentPage + 1);
    }
  }, [currentPage, pageSize, totalCount, isLoading, loadFiltered]);

  // Refresh current page (after filter changes, delete, etc.)
  const refresh = useCallback(() => {
    loadFiltered(currentPage);
  }, [currentPage, loadFiltered]);

  // Auto-load when filters change
  useEffect(() => {
    loadFiltered(0, { fFrom, fTo, shiftId: shiftIdFilter, sort: sortOrder });
  }, [fFrom, fTo, shiftIdFilter, sortOrder, loadFiltered]);

  // Memoized sorted history (already sorted by backend, but keep for safety)
  const sortedHistory = useMemo(() => [...history].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return sortOrder === "asc" ? ta - tb : tb - ta;
  }), [history, sortOrder]);

  // Group by day for day-view
  const histByDay = useMemo(() => sortedHistory.reduce((acc, t) => {
    const k = `${t.hari}, ${t.tgl} ${t.bln} ${t.thn}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {}), [sortedHistory]);

  // ── Shift-based filtering & grouping (client-side on current page)
  // Note: shift filtering is done server-side via shiftIdFilter
  // This groups the current page by shift for shift-view mode
  const histByShift = useMemo(() => {
    const base = sortedHistory; // Already filtered by shiftId if set
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
  }, [sortedHistory]);

  // For CSV export - we need all filtered transactions, not just current page
  // We'll fetch all (or a large batch) when CSV is requested
  const filteredHistoryForExport = useMemo(() => sortedHistory, [sortedHistory]);

  // Append new transaction (optimistic update)
  const appendHistory = useCallback((trx) => {
    setHistory(h => [trx, ...h].slice(0, pageSize));
    setTotalCount(c => c + 1);
  }, [pageSize]);

  // Delete transaction
  const deleteTrx = useCallback(async (id) => {
    const snap = [...history];
    const snapTotal = totalCount;
    await api.deleteTrx(id);
    setHistory(h => h.filter(t => t.id !== id));
    setTotalCount(c => c - 1);
    addUndo("Hapus Transaksi", async () => { 
      await api.restoreTrx(snap); 
      setHistory(snap); 
      setTotalCount(snapTotal);
    });
  }, [history, totalCount, addUndo]);

  // Clear all transactions
  const clearAllTrx = useCallback(async () => {
    const snap = [...history];
    const snapTotal = totalCount;
    await api.clearTrx();
    setHistory([]);
    setTotalCount(0);
    addUndo("Hapus Semua Riwayat", async () => { 
      await api.restoreTrx(snap); 
      setHistory(snap); 
      setTotalCount(snapTotal);
    });
  }, [history, totalCount, addUndo]);

  // CSV timestamp
  const at = useCallback(() => {
    const t = getNow();
    return `${t.hari} ${t.tgl}-${t.bln}-${t.thn} ${t.jam}:${t.mnt}:${t.dtk}`;
  }, [getNow]);

  // CSV export
  const doCSV = useCallback(async (filename, content) => {
    const t = getNow();
    const fn = `${filename}_${t.tgl}-${t.blnNum}-${t.thn}.csv`;
    const res = await api.saveCSV({ filename: fn, content });
    if (res?.ok) toast_(`${filename} disimpan`, "ok"); else toast_("Dibatalkan", "err");
  }, [getNow, toast_]);

  // Load all for export (fetch all pages)
  const loadAllForExport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.loadTrxFiltered({
        fFrom,
        fTo,
        shiftId: shiftIdFilter,
        page: 0,
        pageSize: 10000, // Large page size to get all
        sort: sortOrder
      });
      return result.transactions || [];
    } catch (err) {
      console.error("[useHistory] loadAllForExport error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [fFrom, fTo, shiftIdFilter, sortOrder]);

  // Toggle sort order
  const toggleSort = useCallback(() => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  }, []);

  return {
    // Data
    history,              // current page transactions
    filteredHistory: filteredHistoryForExport, // for backward compat (used in CSV)
    histByDay,
    histByShift,
    
    // Pagination
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    hasMore: (currentPage + 1) * pageSize < totalCount,
    loadMore,
    refresh,
    
    // Filters
    fFrom, fTo, setFFrom, setFTo,
    shiftIdFilter, setShiftIdFilter,
    viewMode, setViewMode,
    sortOrder, toggleSort,
    
    // UI state
    expandedDays, setExpandedDays,
    
    // Actions
    generateTrxId,
    loadInitial,
    appendHistory,
    deleteTrx,
    clearAllTrx,
    at,
    doCSV,
    loadAllForExport,
  };
}

export { useHistory };
