import { useState, useEffect, useRef, useCallback } from "react";
import { METODE_LABELS} from "./constants/payments.js";
import { G, OR, W, LT, BD, TX, MT } from "./constants/colors.js";
import { buildReceiptHTML, buildPreviewHTML, fmt } from "./utilities/receipt.js";
import { normalizeBarcodeInput, findMenuByMenuId } from "./utilities/barcode.js";
import { api } from "./utilities/utils.js";
import { resolveShiftTarget } from "./utilities/shiftState.js";
import { row } from "./constants/styles.js";
import { ClockBadge } from "./components/ClockBadge.jsx";
import { SnakeLoader } from "./components/SnakeLoader.jsx";

import { useToast } from "./hooks/useToast.js";
import { useSettings } from "./hooks/useSettings.js";
import { useLicense } from "./hooks/useLicense.js";
import { useAuth } from "./hooks/useAuth.js";
import { useMenu } from "./hooks/useMenu.js";
import { useBills } from "./hooks/useBills.js";
import { useCart } from "./hooks/useCart.js";
import { useHistory } from "./hooks/useHistory.js";

import ViewOpenBill from "./views/ViewOpenBill.jsx";
import ViewKasir from "./views/ViewKasir.jsx";
import ViewRiwayat from "./views/ViewRiwayat.jsx";
import ViewLaporan from "./views/ViewLaporan.jsx";
import ViewKelola from "./views/ViewKelola.jsx";

import PayModal        from "./components/modals/PayModal.jsx";
import ReceiptModal    from "./components/modals/ReceiptModal.jsx";
import ItemModal       from "./components/modals/ItemModal.jsx";
import CatModal        from "./components/modals/CatModal.jsx";
import SettingsModal   from "./components/modals/SettingsModal.jsx";
import PrinterModal    from "./components/modals/PrinterModal.jsx";
import CloseShiftModal from "./components/modals/CloseShiftModal.jsx";
import ConfirmDelModal from "./components/modals/ConfirmDelModal.jsx";

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// getNow() TIDAK dipindah ke hook manapun — dia dipakai LINTAS hampir semua
// hook (useAuth untuk shift timestamp, useCart untuk trx timestamp, useHistory
// untuk CSV timestamp). Daripada duplikasi function ini di 4 file berbeda,
// dia tetap module-level di App.jsx dan di-pass sebagai parameter ke hook
// yang butuh — konsisten dengan constraint "hooks tidak boleh import hook
// lain", function utilitas murni (bukan hook) aman untuk di-share begini.
function getNow() {
  const d = new Date();
  return {
    timestamp:d.toISOString(),
    hari:HARI[d.getDay()], tgl:String(d.getDate()).padStart(2,"0"),
    bln:BULAN[d.getMonth()], blnNum:String(d.getMonth()+1).padStart(2,"0"),
    thn:String(d.getFullYear()),
    jam:String(d.getHours()).padStart(2,"0"),
    mnt:String(d.getMinutes()).padStart(2,"0"),
    dtk:String(d.getSeconds()).padStart(2,"0"),
  };
}

function AppSkeleton() {
  const bar = (w, h = 12, radius = 999) => (
    <div style={{ width:w, height:h, borderRadius:radius, background:"linear-gradient(90deg, #e9ecef 0%, #f5f7fa 50%, #e9ecef 100%)", backgroundSize:"200% 100%", animation:"shimmer 1.2s linear infinite" }} />
  );

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`, display:"flex", flexDirection:"column", fontFamily:"'Segoe UI',sans-serif" }}>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}"}</style>
      <header style={{ background:W, borderBottom:`1px solid ${BD}`, padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:10, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ width:38, height:38, borderRadius:7, background:"#e9ecef", animation:"shimmer 1.2s linear infinite", backgroundSize:"200% 100%" }} />
        <div style={{ flex:1, display:"grid", gap:4 }}>
          {bar("110px", 12)}
          {bar("70px", 10)}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {bar("90px", 28, 6)}
          {bar("70px", 28, 6)}
        </div>
      </header>

      <div style={{ flex:1, padding:16, display:"grid", gridTemplateColumns:"1.4fr 0.8fr", gap:16, background:LT }}>
        <div style={{ background:W, borderRadius:14, padding:16, boxShadow:"0 12px 28px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            {bar("140px", 14)}
            {bar("70px", 14)}
          </div>
          <div style={{ display:"grid", gap:10, marginBottom:16 }}>
            {bar("100%", 44, 10)}
            {bar("85%", 44, 10)}
            {bar("92%", 44, 10)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
            {bar("100%", 80, 10)}
            {bar("100%", 80, 10)}
            {bar("100%", 80, 10)}
          </div>
        </div>
        <div style={{ background:W, borderRadius:14, padding:16, boxShadow:"0 12px 28px rgba(0,0,0,0.08)" }}>
          {bar("120px", 14)}
          <div style={{ display:"grid", gap:10, marginTop:14 }}>
            {bar("100%", 36, 8)}
            {bar("88%", 36, 8)}
            {bar("92%", 36, 8)}
            {bar("76%", 36, 8)}
          </div>
        </div>
      </div>

      <footer style={{ background:W, borderTop:`1px solid ${BD}`, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        {bar("180px", 10)}
        {bar("60px", 10)}
      </footer>
    </div>
  );
}

// ─── MAIN APP (coordinator) ───────────────────────────────────────────────
function KasirWorkspace() {
  // ── Hooks: panggil semua di sini, App.jsx jadi satu-satunya tempat yang
  // tahu seluruh data flow antar domain. Tidak ada hook yang import hook lain.
  const toastH    = useToast();
  const licenseH  = useLicense();
  const authH     = useAuth({ getNow, toast_: toastH.toast_ });
  const menuH     = useMenu({ toast_: toastH.toast_, addUndo: toastH.addUndo });
  const billsH    = useBills({ toast_: toastH.toast_, addUndo: toastH.addUndo });
  const cartH     = useCart({ toast_: toastH.toast_, getNow, receiptAdditionals: [] });
  const historyH  = useHistory({ toast_: toastH.toast_, addUndo: toastH.addUndo, getNow });
  // settingsH needs cartH to be defined first for onChange callback
  const settingsH = useSettings({ 
    toast_: toastH.toast_, 
    onChange: (newSettings) => {
      cartH.setReceiptAdditionals(newSettings.receiptAdditionals || []);
    }
  });

  // ── Navigasi (UI-level, tidak dimiliki domain manapun)
  const [view, setView] = useState("menu");

  // ── confirmDel: SENGAJA tetap di App.jsx, bukan di salah satu hook.
  // Dipakai lintas domain (hapus trx/bill/item/kategori) dengan shape
  // {type, id}. Memilikinya di satu hook tertentu akan membuat hook itu
  // harus tahu tentang domain lain (melanggar constraint "no cross-hook
  // import") — jadi dia tinggal di coordinator level.
  const [confirmDel, setConfirmDel] = useState(null);

  // ── Snake loader state for button actions
  const [showSnakeLoader, setShowSnakeLoader] = useState(false);
  const [snakeLoaderTrigger, setSnakeLoaderTrigger] = useState(null); // "login" | "license"
  const [loginTransitioning, setLoginTransitioning] = useState(false); // keeps login screen visible during loader
  const [licenseTransitioning, setLicenseTransitioning] = useState(false); // keeps license screen visible during loader
  const [showPw, setShowPw] = useState(false); // hold-to-show password
  const [openingCashModal, setOpeningCashModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ deskripsi: "", kategori: "operasional", jumlah: "" });
  const [expenseCategoryDraft, setExpenseCategoryDraft] = useState("");

  // ── Shared login handler (button click + Enter key)
  const handleLogin = useCallback(async () => {
    if (!authH.loginForm.username || !authH.loginForm.password || showSnakeLoader) return;
    setSnakeLoaderTrigger("login");
    setShowSnakeLoader(true);
    setLoginTransitioning(true);
    const ok = await authH.doLogin();
    await new Promise(r => setTimeout(r, 1200));
    setShowSnakeLoader(false);
    setLoginTransitioning(false);
    if (ok) setOpeningCashModal(true);
  }, [authH, showSnakeLoader])

  const handleSaveOpeningCash = useCallback(async () => {
    try {
      const savedShifts = await api.loadShifts();
      const targetShift = resolveShiftTarget({
        shifts: savedShifts || authH.shifts || [],
        activeShift: authH.activeShift,
        selectedShiftId: authH.selectedShiftId,
      });
      const targetShiftId = targetShift?.id || authH.selectedShiftId;
      if (!targetShiftId) return;

      const value = Number(String(openingCashInput).replace(/[^\d]/g, "")) || 0;
      authH.setSelectedShiftId(targetShiftId);
      const updated = await authH.updateShift(targetShiftId, { openingCash: value }, savedShifts || authH.shifts || []);
      if (!updated) {
        toastH.toast_("Shift aktif tidak ditemukan", "err");
        return;
      }

      setOpeningCashInput("");
      setOpeningCashModal(false);
      toastH.toast_("Uang kas berhasil disimpan", "ok");
    } catch (err) {
      console.error("[App] save opening cash failed:", err);
      toastH.toast_("Gagal menyimpan uang kas awal", "err");
    }
  }, [authH, openingCashInput, toastH]);

  const handleSkipOpeningCash = useCallback(() => {
    setOpeningCashInput("");
    setOpeningCashModal(false);
  }, []);

  const handleSaveExpense = useCallback(async () => {
    if (!authH.activeShift || !expenseForm.deskripsi.trim() || !expenseForm.jumlah) return;
    const amount = Number(String(expenseForm.jumlah).replace(/[^\d]/g, "")) || 0;
    const nextExpense = {
      id: `exp_${Date.now()}`,
      deskripsi: expenseForm.deskripsi.trim(),
      kategori: expenseForm.kategori,
      jumlah: amount,
      createdAt: new Date().toISOString(),
    };
    const currentExpenses = Array.isArray(authH.activeShift?.expenses) ? authH.activeShift.expenses : [];
    await authH.updateShift(authH.activeShift.id, { expenses: [...currentExpenses, nextExpense] });
    setExpenseForm({ deskripsi: "", kategori: "operasional", jumlah: "" });
    setExpenseModal(false);
    toastH.toast_("Pengeluaran berhasil ditambahkan", "ok");
  }, [authH, expenseForm, toastH]);

  const expenseCategories = settingsH.settings.expenseCategories || [];
  const currentShiftExpenses = Array.isArray(authH.activeShift?.expenses) ? authH.activeShift.expenses : [];
  const totalExpenses = currentShiftExpenses.reduce((sum, item) => sum + Number(item.jumlah || 0), 0);
  const openingCash = Number(authH.activeShift?.openingCash || 0);

  // ── Receipt & Pay modal — UI state yang menjembatani cart+history, tetap di App.jsx
  const [payModal, setPayModal] = useState(false);
  const [receipt, setReceipt]   = useState(null);
  const [printingPreview, setPrintingPreview] = useState(false);

  const [dataPath, setDataPath] = useState("");

  const logoRef   = settingsH.logoRef;
  const searchRef = useRef();
  const scanBufferRef = useRef("");
  const scanTimeoutRef = useRef(null);
  const lastScanRef = useRef({ code: "", time: 0 });

  const handleBarcodeScanned = useCallback((rawCode, source = "keyboard") => {
    const code = normalizeBarcodeInput(rawCode);
    if (!code) return;

    const now = Date.now();
    if (code === lastScanRef.current.code && now - lastScanRef.current.time < 300) return;
    lastScanRef.current = { code, time: now };

    if (source === "keyboard") {
      menuH.setSearch(code);
      return;
    }

    menuH.setSearch(code);
  }, [menuH.setSearch]);

  useEffect(() => {
    const trimmed = menuH.search.trim();
    if (!trimmed) return;

    const match = findMenuByMenuId(menuH.menu, trimmed);
    if (!match) return;

    setView("menu");
    cartH.addToCart(match);
    toastH.toast_(`+1 ${match.nama}`, "ok");
    menuH.setSearch("");
  }, [cartH.addToCart, menuH.menu, menuH.search, menuH.setSearch, toastH.toast_]);

  useEffect(() => {
    const flushScan = () => {
      const code = normalizeBarcodeInput(scanBufferRef.current);
      scanBufferRef.current = "";
      if (code) handleBarcodeScanned(code, "keyboard");
    };

    const onKeyDown = (e) => {
      const targetTag = e.target?.tagName || "";
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT" || e.target?.isContentEditable) return;
      if (e.key === "Enter") {
        flushScan();
        return;
      }
      if (e.key.length !== 1) return;

      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanBufferRef.current += e.key;
      scanTimeoutRef.current = setTimeout(flushScan, 80);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [handleBarcodeScanned]);

  useEffect(() => {
    if (!window.kasirAPI?.onBarcodeScanned) return undefined;
    return window.kasirAPI.onBarcodeScanned((code) => {
      handleBarcodeScanned(code, "hid");
    });
  }, [handleBarcodeScanned]);

  // ── Cek license dulu sebelum load data
  useEffect(() => { licenseH.checkLicenseOnLoad(); }, []);

  // ── Load data (sekali saat mount) — distribusikan ke tiap hook
  useEffect(() => {
    (async () => {
      const [trxs, savedMenu, savedLogo, savedBills, savedCats, savedSettings, dp, savedShifts, savedUsers] = await Promise.all([
        api.loadTrx(), api.loadMenu(), api.loadLogo(), api.loadBills(),
        api.loadCats(), api.loadSettings(), api.getDataPath(), api.loadShifts(), api.loadUsers(),
      ]);
      historyH.loadInitial(trxs);
      menuH.loadInitial(savedMenu, savedCats);
      settingsH.loadInitial(savedLogo, savedSettings);
      billsH.loadInitial(savedBills);
      authH.loadInitial(savedShifts, savedUsers);
      setDataPath(dp);
    })();
  }, []);

  // ── Hotkeys
  useEffect(() => {
    const handler = (e) => {
      const tagName = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      switch (e.key.toUpperCase()) {
        case "K": setView("menu"); break;
        case "O": setView("bills"); break;
        case "R": setView("history"); break;
        case "L": setView("laporan"); break;
        case "M": setView("kelola"); break;
        case "P": cartH.setDrawerOpen(d => !d); break;
        case "/": e.preventDefault(); setView("menu"); setTimeout(() => searchRef.current?.focus(), 80); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Wiring lintas-hook (pengganti fungsi lama yang dulu di satu scope)
  // Semua dibungkus useCallback supaya stabil sebagai props ke views/ yang
  // di-React.memo() — tanpa ini, fungsi-fungsi ini selalu jadi reference
  // baru tiap render App.jsx, dan memo di child jadi tidak efektif.

  // saveOpenBill butuh bills/billId/persistBills dari useBills (parameter, bukan import)
  const saveOpenBill = useCallback(() => cartH.saveOpenBill({
    bills: billsH.bills, billId: billsH.billId,
    persistBills: billsH.persistBills, setBillId: billsH.setBillId,
    computeStockDeduction: menuH.computeStockDeduction,
    commitMenu: menuH.setMenu,
  }), [cartH.saveOpenBill, billsH.bills, billsH.billId, billsH.persistBills, billsH.setBillId, menuH.computeStockDeduction, menuH.setMenu]);

  // processPayment butuh potongan dari useHistory, useMenu, useAuth, useBills
  // FIX: Use cartH.activeBill?.id directly to avoid race condition with setTimeout
  const processPayment = useCallback(() => cartH.processPayment({
    generateTrxId: historyH.generateTrxId,
    activeShift: authH.activeShift,
    computeStockDeduction: menuH.computeStockDeduction,
    commitMenu: menuH.setMenu,
    appendHistory: (trx) => { historyH.appendHistory(trx); setReceipt(trx); setPayModal(false); cartH.setDrawerOpen(false); cartH.clearCart(); },
    removeBillLocal: billsH.removeBillLocal,
    billIdToClose: cartH.activeBill?.id,     // Use activeBill directly instead of ref
    paymentMethods: settingsH.settings.paymentMethods || [], // NEW: payment methods for label resolution
    menu: menuH.menu, // Pass current menu for open bill payment (no stock deduction)
  }), [
    cartH.processPayment, historyH.generateTrxId, authH.activeShift,
    menuH.computeStockDeduction, menuH.setMenu, historyH.appendHistory,
    cartH.setDrawerOpen, cartH.clearCart, billsH.removeBillLocal,
    settingsH.settings.paymentMethods, // NEW deps
    menuH.menu, // Add menu to deps
  ]);

  // confirmCloseShift butuh clearCart saja — clearBills DIHAPUS
  // Open bill TIDAK PERNAH dihapus otomatis saat tutup shift
  // (hanya dihapus jika sudah dibayar via processPayment -> removeBillLocal)
  const confirmCloseShift = useCallback(() => authH.confirmCloseShift({
    clearCart: cartH.clearCart,
  }), [authH.confirmCloseShift, cartH.clearCart]);

  // printReceipt(trx) — generic, dari useSettings.printHTML + buildReceiptHTML
  // PENTING: membaca settingsH.logo langsung. Wajib di deps.
  const printReceipt = useCallback(async (trx) => {
    const html = buildReceiptHTML(trx, settingsH.logo, settingsH.settings.receiptAdditionals, settingsH.settings.qrisImages, settingsH.settings.warungName, menuH.cats, settingsH.settings.warungAddress, settingsH.settings.warungPhone, settingsH.settings.paymentMethods, settingsH.settings.receiptPaperWidthMm);
    await settingsH.printHTML(html, "Selesai Mencetak Resi");
  }, [settingsH.logo, settingsH.printHTML, settingsH.settings.receiptAdditionals, settingsH.settings.qrisImages, settingsH.settings.warungName, settingsH.settings.warungAddress, settingsH.settings.warungPhone, menuH.cats, settingsH.settings.paymentMethods, settingsH.settings.receiptPaperWidthMm]);

  // printPreview — depend ke cart (items/receiptAdditionalValues), pakai printHTML generic dari settings
  // PENTING: membaca cartH.items/receiptAdditionalValues dan settingsH.logo langsung. Semua wajib di deps.
  const printPreview = useCallback(async () => {
    if (!cartH.items.length) { toastH.toast_("Isi pesanan dulu", "err"); return; }
    setPrintingPreview(true);
    try {
      const html = buildPreviewHTML(cartH.receiptAdditionalValues, cartH.items, settingsH.logo, settingsH.settings.receiptAdditionals, settingsH.settings.warungName, menuH.cats, settingsH.settings.warungAddress, settingsH.settings.warungPhone, settingsH.settings.receiptPaperWidthMm);
      await settingsH.printHTML(html, "Mencetak preview tagihan...");
    } finally {
      setPrintingPreview(false);
    }
  }, [cartH.items, cartH.receiptAdditionalValues, toastH.toast_, settingsH.logo, settingsH.printHTML, settingsH.settings.receiptAdditionals, settingsH.settings.warungName, settingsH.settings.warungAddress, settingsH.settings.warungPhone, menuH.cats, settingsH.settings.receiptPaperWidthMm]);

  // Dipanggil dari tombol "Bayar" di Open Bill view — pola setTimeout
  // DIPERTAHANKAN PERSIS dari kode asli (lihat catatan di useCart.js bagian
  // atas perihal bug race condition yang belum di-root-cause).
  const loadBillAndPay = useCallback((bill) => {
    cartH.loadBillToCart(bill);
    setView("menu");
    setTimeout(() => setPayModal(true), 300);
  }, [cartH.loadBillToCart, setView]);

  // confirmDel dispatcher — menggantikan switch-case yang dulu inline di modal konfirmasi
  // PENTING: membaca confirmDel langsung dari closure. Wajib di deps, atau
  // dispatcher akan selalu mengeksekusi confirmDel dari render pertama (null).
const executeConfirmDel = useCallback(() => {
    if (!confirmDel) return;
    if (confirmDel.type === "all") historyH.clearAllTrx();
    else if (confirmDel.type === "trx") historyH.deleteTrx(confirmDel.id);
    else if (confirmDel.type === "allBills") billsH.clearAllBills();
    else if (confirmDel.type === "bill") {
      // For open bills, cancel and restore stock
      billsH.cancelBill(confirmDel.id, {
        computeStockRestoration: menuH.computeStockRestoration,
        computeStockDeduction: menuH.computeStockDeduction,
        commitMenu: menuH.setMenu,
      });
    }
    else if (confirmDel.type === "allMenu") menuH.clearAllMenu();   // ← new, must be explicit
    else menuH.deleteItem(confirmDel.id);
    setConfirmDel(null);
  }, [confirmDel, historyH.clearAllTrx, historyH.deleteTrx, billsH.clearAllBills, billsH.cancelBill, menuH.computeStockRestoration, menuH.computeStockDeduction, menuH.setMenu, menuH.clearAllMenu, menuH.deleteItem]);
 
  const at = historyH.at;
  const doCSV = historyH.doCSV;

  const showLicenseScreen = licenseH.licenseStatus !== null && (!licenseH.licenseStatus.valid || licenseTransitioning);
  const showLoginScreen = licenseH.licenseStatus !== null && (!authH.activeShift || loginTransitioning);

  let content;

  if (licenseH.licenseStatus === null) {
    content = <AppSkeleton />;
  } else if (showLicenseScreen) {
    content = (
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:W,borderRadius:18,padding:"36px 32px",width:400,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:18,fontWeight:700,color:G}}>Aktivasi Software</div>
            <div style={{fontSize:11,color:MT,marginTop:3}}>Software Kasir</div>
          </div>

          <div style={{background:LT,border:`1px solid ${BD}`,borderRadius:10,padding:"13px 15px",marginBottom:18}}>
            <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:6}}>HARDWARE ID PERANGKAT INI</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <code style={{fontSize:15,fontWeight:700,color:G,letterSpacing:2,flex:1,fontFamily:"monospace"}}>{licenseH.hardwareId||"Memuat..."}</code>
              <button onClick={licenseH.copyHwid} style={{padding:"5px 10px",background:licenseH.copied?"#e8f5ee":"#e8eef5",color:licenseH.copied?G:"#2a5a8a",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700}}>
                {licenseH.copied?"✓ Disalin":"Salin"}
              </button>
            </div>
            <div style={{fontSize:10,color:MT,marginTop:8,lineHeight:1.6}}>Kirim kode ini ke penjual via WhatsApp/email untuk mendapat License Key.</div>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:5}}>LICENSE KEY</label>
            <input autoFocus value={licenseH.licKey} onChange={e=>{licenseH.setLicKey(e.target.value.toUpperCase());licenseH.setLicErr("");}}
              onKeyDown={e=>e.key==="Enter"&&licenseH.doActivate()}
              placeholder="YKK-XXXXX-XXXXX-XXXXX-XXXXX"
              style={{width:"100%",padding:"11px 13px",boxSizing:"border-box",border:`1.5px solid ${licenseH.licErr?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"monospace",letterSpacing:1,outline:"none",background:licenseH.licErr?"#fff5f5":W}}
            />
            {licenseH.licErr&&<div style={{color:"#e84040",fontSize:11,fontWeight:600,marginTop:5}}>❌ {licenseH.licErr}</div>}
          </div>
          <div style={{ position: "relative", width: "100%" }}>
            <button
              onClick={async () => { 
                setSnakeLoaderTrigger("license"); 
                setShowSnakeLoader(true); 
                setLicenseTransitioning(true);
                await licenseH.doActivate();
                await new Promise(r => setTimeout(r, 1200));
                setShowSnakeLoader(false);
                setLicenseTransitioning(false);
              }}
              disabled={!licenseH.licKey.trim()||licenseH.licLoad||showSnakeLoader}
              style={{width:"100%",padding:13,background:licenseH.licKey.trim()&&!licenseH.licLoad&&!showSnakeLoader?G:"#aaa",color:W,border:"none",borderRadius:9,cursor:licenseH.licKey.trim()&&!licenseH.licLoad&&!showSnakeLoader?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}
            >
              {showSnakeLoader && snakeLoaderTrigger === "license" ? <SnakeLoader visible={true} minDuration={1200} size={24} color="#fff" /> : (licenseH.licLoad?"Memvalidasi...":"Aktifkan Software")}
            </button>
          </div>
          <div style={{textAlign:"center",marginTop:16,fontSize:10,color:MT,lineHeight:1.7}}>
            License terikat ke perangkat ini.<br/>Pindah PC? Hubungi penjual untuk reset aktivasi.
          </div>
        </div>
      </div>
    );
  } else if (showLoginScreen) {
    content = (
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:W,borderRadius:18,padding:"36px 32px",width:360,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            {settingsH.logo&&<img src={settingsH.logo} alt="logo" style={{width:64,height:64,borderRadius:12,objectFit:"cover",marginBottom:10}}/>}
            <div style={{fontSize:18,fontWeight:700,color:G}}>{settingsH.settings.warungName || "Warung"}</div>
            <div style={{fontSize:12,color:MT,marginTop:2}}>Powered by DEN POS</div>
          </div>

          {authH.shifts.filter(s=>s.status==="closed").slice(-1).map(s=>(
            <div key={s.id} style={{background:"#e8f5ee",border:"1px solid #a8d5b8",borderRadius:8,padding:"9px 12px",marginBottom:16,fontSize:10,color:"#1a5c38"}}>
              <b>Shift terakhir:</b> Shift {s.shiftNum} · {s.hari} {s.tgl} {s.bln} {s.thn} · {s.startJam}–{s.endJam||"?"} · {s.operator}
            </div>
          ))}

          <div style={{marginBottom:11}}>
            <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:4}}>USERNAME</label>
            <input
              autoFocus
              type="text" value={authH.loginForm.username}
              onChange={e=>authH.setLoginForm(f=>({...f,username:e.target.value,error:""}))}
              onKeyDown={e=>e.key==="Enter"&&document.getElementById("pw-input")?.focus()}
              placeholder="Masukkan username..."
              style={{width:"100%",padding:"10px 12px",boxSizing:"border-box",border:`1.5px solid ${authH.loginForm.error?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",marginBottom:10}}
            />
            <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:4}}>PASSWORD</label>
            <div style={{position:"relative",width:"100%"}}>
              <input
                id="pw-input"
                type={showPw ? "text" : "password"}
                value={authH.loginForm.password}
                onChange={e=>authH.setLoginForm(f=>({...f,password:e.target.value,error:""}))}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="Masukkan password..."
                style={{width:"100%",padding:"10px 44px 10px 12px",boxSizing:"border-box",border:`1.5px solid ${authH.loginForm.error?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
              />
              <button
                type="button"
                onMouseDown={() => setShowPw(true)}
                onMouseUp={() => setShowPw(false)}
                onMouseLeave={() => setShowPw(false)}
                onTouchStart={(e) => { e.preventDefault(); setShowPw(true); }}
                onTouchEnd={() => setShowPw(false)}
                onTouchCancel={() => setShowPw(false)}
                style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center",justifyContent:"center",color:MT}}
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPw ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          {authH.loginForm.error&&<div style={{color:"#e84040",fontSize:11,fontWeight:600,marginBottom:10,textAlign:"center"}}>{authH.loginForm.error}</div>}
          <div style={{ position: "relative", width: "100%" }}>
            <button
              onClick={handleLogin}
              disabled={!authH.loginForm.username||!authH.loginForm.password||showSnakeLoader}
              style={{width:"100%",padding:"12px",background:authH.loginForm.username&&authH.loginForm.password&&!showSnakeLoader?G:"#aaa",color:W,border:"none",borderRadius:9,cursor:authH.loginForm.username&&authH.loginForm.password&&!showSnakeLoader?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}
            >
              {showSnakeLoader && snakeLoaderTrigger === "login" ? <SnakeLoader visible={true} minDuration={1200} size={24} color="#fff" /> : "Mulai Shift"}
            </button>
          </div>

          {authH.shifts.length>0&&(
            <div style={{marginTop:20}}>
              <div style={{fontSize:10,color:MT,fontWeight:600,marginBottom:7}}>RIWAYAT SHIFT</div>
              <div style={{maxHeight:140,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {[...authH.shifts].reverse().slice(0,5).map(s=>(
                  <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:LT,borderRadius:6,fontSize:10}}>
                    <span><b style={{color:G}}>Shift {s.shiftNum}</b> · {s.tgl} {s.bln} {s.thn}</span>
                    <span style={{color:MT}}>{s.startJam}{s.endJam?`–${s.endJam}`:""} · {s.operator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    content = (
    <div
     style={{
      height:"100vh",
      display:"flex",
      flexDirection:"column",
      fontFamily:"'Segoe UI',sans-serif",
      background:LT,
      color:TX,
      overflow:"hidden"
      }}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <header style={{background:W,borderBottom:`1px solid ${BD}`,padding:"0 16px",height:56,display:"flex",alignItems:"center",gap:10,flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        {/* Logo */}
        <div style={{position:"relative",flexShrink:0}}>
          <div onClick={()=>logoRef.current.click()} title="Klik untuk upload logo" style={{width:38,height:38,borderRadius:7,overflow:"hidden",border:`2px dashed ${settingsH.logo?G:BD}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",background:settingsH.logo?"transparent":LT}}>
            {settingsH.logo?<img src={settingsH.logo} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:9,color:MT}}>Logo</span>}
          </div>
          {settingsH.logo&&<button onClick={(e)=>{e.stopPropagation();settingsH.handleLogoRemove();}} title="Hapus logo" style={{position:"absolute",top:-7,right:-7,width:16,height:16,borderRadius:"50%",border:"none",background:"#e84040",color:"#fff",fontSize:9,lineHeight:"16px",textAlign:"center",cursor:"pointer",padding:0,fontWeight:700}}>✕</button>}
        </div>
        <input ref={logoRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={settingsH.handleLogoUpload}/>
        <div style={{flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:G}}>Sistem Kasir</div>
          <div style={{fontSize:9,color:OR,fontWeight:600}}>{settingsH.settings.warungName || "Warung"}</div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:2,marginLeft:8}}>
          {[{key:"menu",label:"Kasir",hotkey:"K"},{key:"bills",label:`Open Bill (${billsH.bills.filter(b=>b.status==="open").length})`,hotkey:"O"},{key:"history",label:`Riwayat (${historyH.history.length})`,hotkey:"R"},{key:"laporan",label:"Laporan",hotkey:"L"},{key:"kelola",label:"Menu",hotkey:"M"}].map(b=>(
            <button key={b.key} onClick={()=>setView(b.key)} title={`Hotkey: ${b.hotkey}`} style={{padding:"4px 11px",borderRadius:5,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,background:view===b.key?G:"transparent",color:view===b.key?W:MT,transition:"all 0.15s"}}>
              {b.label}
            </button>
          ))}
        </div>

        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={() => settingsH.setSettingsModal(true)} title="Pengaturan" style={{padding:"4px 10px",background:LT,color:G,border:`1px solid ${BD}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600}}>
            ⚙️ Pengaturan
          </button>
          {/* Shift badge */}
          {authH.activeShift&&(
            <div style={{fontSize:10,color:G,padding:"4px 9px",background:"#e8f5ee",borderRadius:5,border:"1px solid #a8d5b8",fontWeight:600}}>
              Shift {authH.activeShift.shiftNum} · {authH.activeShift.startJam} · {authH.activeShift.operator}
            </div>
          )}
          <ClockBadge/>
          {/* Tutup Shift */}
          <button onClick={()=>authH.setClosingShift(true)} style={{padding:"4px 10px",background:"#fef0f0",color:"#e84040",border:"1px solid #f5a8a8",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700}}>
            Tutup Shift
          </button>
        </div>
      </header>

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>


        {/* ══════ MENU VIEW ════════════════════════════════════════════════ */}
        {view==="menu" && (
          <ViewKasir
            allCats={menuH.allCats} kategori={menuH.kategori} setKategori={menuH.setKategori}
            search={menuH.search} setSearch={menuH.setSearch} displayMenu={menuH.displayMenu} cats={menuH.cats}
            cart={cartH.cart} drawerOpen={cartH.drawerOpen} setDrawerOpen={cartH.setDrawerOpen}
            receiptAdditionalValues={cartH.receiptAdditionalValues} receiptAdditionals={cartH.receiptAdditionals} updateReceiptAdditionalValue={cartH.updateReceiptAdditionalValue}
            items={cartH.items} subtotal={cartH.subtotal} service={cartH.service}
            pajak={cartH.pajak} total={cartH.total} activeBill={cartH.activeBill}
            addToCart={cartH.addToCart} decCart={cartH.decCart} delCart={cartH.delCart} clearCart={cartH.clearCart}
            saveOpenBill={saveOpenBill} printPreview={printPreview} printingPreview={printingPreview} setPayModal={setPayModal}
            searchRef={searchRef}
            checkRequiredAdditionals={cartH.checkRequiredAdditionals}
          />
        )}


        {/* ══════ OPEN BILL VIEW ══════════════════════════════════════════ */}
        {view==="bills"&&(
          <ViewOpenBill
            bills={billsH.bills}
            loadBillToCart={cartH.loadBillToCart}
            setView={setView}
            loadBillAndPay={loadBillAndPay}
            setConfirmDel={setConfirmDel}
            settingsH={settingsH}
          />
        )}


        {/* ══════ HISTORY VIEW ════════════════════════════════════════════ */}
        {view==="history"&&(
          <ViewRiwayat
            fFrom={historyH.fFrom} setFFrom={historyH.setFFrom}
            fTo={historyH.fTo} setFTo={historyH.setFTo}
            history={historyH.history}
            histByDay={historyH.histByDay}
            expandedDays={historyH.expandedDays} setExpandedDays={historyH.setExpandedDays}
            doCSV={historyH.doCSV} at={historyH.at}
            setConfirmDel={setConfirmDel}
            setReceipt={setReceipt}
            // New: shift-based view
            viewMode={historyH.viewMode} setViewMode={historyH.setViewMode}
            shiftIdFilter={historyH.shiftIdFilter} setShiftIdFilter={historyH.setShiftIdFilter}
            histByShift={historyH.histByShift}
            shifts={authH.shifts}
            paymentMethods={settingsH.settings.paymentMethods}
            menuH={menuH}
            // Pagination
            totalCount={historyH.totalCount} currentPage={historyH.currentPage} pageSize={historyH.pageSize}
            isLoading={historyH.isLoading} hasMore={historyH.hasMore} loadMore={historyH.loadMore}
            refresh={historyH.refresh} loadAllForExport={historyH.loadAllForExport}
            sortOrder={historyH.sortOrder} toggleSort={historyH.toggleSort}
          />
        )}

        {/* ══════ LAPORAN VIEW ════════════════════════════════════════════ */}
        {view==="laporan"&&(
          <ViewLaporan
            selectedShiftId={authH.selectedShiftId} setSelectedShiftId={authH.setSelectedShiftId}
            shifts={authH.shifts} activeShift={authH.activeShift}
            history={historyH.history}
            menu={menuH.menu}
            menuH={menuH}
            doCSV={doCSV} at={at}
            paymentMethods={settingsH.settings.paymentMethods}            expenseCategories={settingsH.settings.expenseCategories || []}
            openingCash={openingCash}
            totalExpenses={totalExpenses}
            onOpenExpenseModal={() => setExpenseModal(true)}
            onOpenCashModal={() => setOpeningCashModal(true)}          />
        )}

        {/* ══════ KELOLA MENU VIEW ════════════════════════════════════════ */}
        {view==="kelola"&&(
          <ViewKelola
            menu={menuH.menu} cats={menuH.cats} allCats={menuH.allCats}
            setCatModal={menuH.setCatModal} openAdd={menuH.openAdd} openEdit={menuH.openEdit}
            setConfirmDel={setConfirmDel}
            search={menuH.search} setSearch={menuH.setSearch}
          />
        )}
      </div>

      {/* FOOTER */}
      <footer style={{background:W,borderTop:`1px solid ${BD}`,padding:"3px 16px",...row,flexShrink:0}}>
        <span style={{fontSize:9,color:MT}}>Terima kasih berkunjung ke <span style={{color:OR,fontWeight:600}}>{settingsH.settings.warungName || "Warung"}</span></span>
        {dataPath&&<span style={{fontSize:8,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>{dataPath}</span>}
        <span style={{fontSize:9,color:MT}}>v3.0.0</span>
      </footer>

      {/* ══ MODAL: PEMBAYARAN ══════════════════════════════════════════════ */}
      {payModal && (
        <PayModal cartH={cartH} processPayment={processPayment} setPayModal={setPayModal} paymentMethods={settingsH.settings.paymentMethods} receiptAdditionals={settingsH.settings.receiptAdditionals} />
      )}

      {/* ══ MODAL: RESI (klik transaksi atau setelah bayar) ════════════════ */}
      {receipt && (
        <ReceiptModal receipt={receipt} logo={settingsH.logo} printReceipt={printReceipt} setReceipt={setReceipt} receiptAdditionals={settingsH.settings.receiptAdditionals} qrisImages={settingsH.settings.qrisImages} paymentMethods={settingsH.settings.paymentMethods} />
      )}

      {/* ══ MODAL: TAMBAH/EDIT MENU ════════════════════════════════════════ */}
      {menuH.itemModal && (
        <ItemModal menuH={menuH} />
      )}

      {/* ══ MODAL: KELOLA KATEGORI ════════════════════════════════════════ */}
      {menuH.catModal && (
        <CatModal menuH={menuH} />
      )}

      {/* ══ MODAL: SETTINGS (PRINTER & PAYMENT) ════════════════════════════ */}
      {settingsH.settingsModal && (
        <SettingsModal settingsH={settingsH} authH={authH} />
      )}

      {/* ══ MODAL: PRINTER (Legacy, kept for backward compatibility) ════════ */}
      {settingsH.printerModal && (
        <PrinterModal settingsH={settingsH} />
      )}

      {/* ══ MODAL: KONFIRMASI TUTUP SHIFT ════════════════════════════════ */}
      {authH.closingShift && (
        <CloseShiftModal authH={authH} confirmCloseShift={confirmCloseShift} />
      )}

      {/* ══ MODAL: MASUKAN UANG KAS ════════════════════════════════════════ */}
      {openingCashModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,15,0.72)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: W, width: 420, maxWidth: "92vw", borderRadius: 16, padding: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 6 }}>Masukan Uang Kas</div>
            <div style={{ fontSize: 12, color: MT, marginBottom: 18 }}>Masukkan jumlah uang kas awal saat mulai shift agar laporan bisa menghitung saldo kas.</div>
            <label style={{ display: "block", fontSize: 11, color: MT, fontWeight: 700, marginBottom: 6 }}>Jumlah Kas (Rp)</label>
            <input
              autoFocus
              type="text"
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BD}`, fontSize: 18, fontWeight: 700, fontFamily: "inherit", marginBottom: 18 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={handleSkipOpeningCash} style={{ background: LT, color: TX, border: `1px solid ${BD}`, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Lewati</button>
              <button type="button" onClick={handleSaveOpeningCash} style={{ background: G, color: W, border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: MASUKAN PENGELUARAN ══════════════════════════════════════ */}
      {expenseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,15,0.68)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: W, width: 500, maxWidth: "92vw", borderRadius: 16, padding: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: G, marginBottom: 6 }}>Masukan Pengeluaran</div>
            <div style={{ fontSize: 12, color: MT, marginBottom: 18 }}>Catat pengeluaran kas agar laporan keuangan menampilkan total pengeluaran dan laba bersih.</div>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: MT, fontWeight: 700, marginBottom: 6 }}>Deskripsi</label>
                <input value={expenseForm.deskripsi} onChange={(e) => setExpenseForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Contoh: Beli gula, bayar listrik, dll" style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${BD}`, fontSize: 13, fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: MT, fontWeight: 700, marginBottom: 6 }}>Kategori Pengeluaran</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {(expenseCategories.length ? expenseCategories : [{ key: "operasional", label: "Operasional" }]).map(cat => (
                    <button key={cat.key} type="button" onClick={() => setExpenseForm(f => ({ ...f, kategori: cat.key }))} style={{ padding: "7px 10px", borderRadius: 8, border: expenseForm.kategori === cat.key ? `1.5px solid ${G}` : `1px solid ${BD}`, background: expenseForm.kategori === cat.key ? "#e8f5ee" : W, color: expenseForm.kategori === cat.key ? G : TX, fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>{cat.label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={expenseCategoryDraft} onChange={(e) => setExpenseCategoryDraft(e.target.value)} placeholder="Tambah kategori baru" style={{ flex: 1, boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${BD}`, fontSize: 12, fontFamily: "inherit" }} />
                  <button type="button" onClick={async () => {
                    const draft = expenseCategoryDraft.trim();
                    if (!draft) return;
                    const exists = expenseCategories.some(c => c.label.toLowerCase() === draft.toLowerCase());
                    if (exists) { toastH.toast_("Kategori sudah ada", "err"); return; }
                    settingsH.setNewExpenseCategoryLabel(draft);
                    await settingsH.addExpenseCategory();
                    setExpenseCategoryDraft("");
                  }} style={{ padding: "10px 14px", border: "none", borderRadius: 8, background: G, color: W, fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>Tambah</button>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: MT, fontWeight: 700, marginBottom: 6 }}>Jumlah Pengeluaran (Rp)</label>
                <input value={expenseForm.jumlah} onChange={(e) => setExpenseForm(f => ({ ...f, jumlah: e.target.value.replace(/\D/g, "") }))} placeholder="0" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${BD}`, fontSize: 18, fontWeight: 700, fontFamily: "inherit" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setExpenseModal(false)} style={{ background: LT, color: TX, border: `1px solid ${BD}`, borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Batal</button>
              <button onClick={handleSaveExpense} disabled={!expenseForm.deskripsi.trim() || !expenseForm.jumlah} style={{ background: expenseForm.deskripsi.trim() && expenseForm.jumlah ? G : "#a9b7b0", color: W, border: "none", borderRadius: 8, padding: "10px 18px", cursor: expenseForm.deskripsi.trim() && expenseForm.jumlah ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 700 }}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: KONFIRMASI HAPUS ════════════════════════════════════════ */}
      {confirmDel && (
        <ConfirmDelModal confirmDel={confirmDel} setConfirmDel={setConfirmDel} executeConfirmDel={executeConfirmDel} />
      )}

      {/* ── UNDO BANNER ──────────────────────────────────────────────────── */}
      {toastH.undoBuf&&(
        <div style={{position:"fixed",bottom:50,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:W,padding:"10px 18px",borderRadius:9,fontSize:12,fontWeight:600,zIndex:400,boxShadow:"0 4px 16px rgba(0,0,0,0.3)",display:"flex",gap:14,alignItems:"center",whiteSpace:"nowrap"}}>
          <span>{toastH.undoBuf.label} dihapus</span>
          <button onClick={toastH.doUndo} style={{background:OR,color:W,border:"none",borderRadius:5,padding:"4px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>Undo</button>
        </div>
      )}

      {/* ── TOAST ────────────────────────────────────────────────────────── */}
      {toastH.toast&&(
        <div style={{position:"fixed",bottom:toastH.undoBuf?95:50,left:"50%",transform:"translateX(-50%)",background:toastH.toast.type==="ok"?"#e8f5ee":"#fef0f0",border:`1px solid ${toastH.toast.type==="ok"?"#a8d5b8":"#f5a8a8"}`,color:toastH.toast.type==="ok"?G:"#e84040",padding:"8px 16px",borderRadius:8,fontSize:11,fontWeight:600,zIndex:400,boxShadow:"0 4px 14px rgba(0,0,0,0.1)",whiteSpace:"nowrap"}}>
          {toastH.toast.msg}
        </div>
      )}
    </div>
    );
  }

  return content;
}

export default function Kasir() {
  return <KasirWorkspace />;
}
