import { useState, useEffect, useRef, useCallback } from "react";
import { METODE_LABELS} from "./constants/payments.js";
import { OR, W, LT, BD, TX, MT } from "./constants/design.js";
import { buildReceiptHTML, buildPreviewHTML, fmt } from "./utilities/receipt.js";
import { getPrinterSelectionStatus } from "./utilities/printer.js";
import { api } from "./utilities/utils.js";
import { AppSkeleton } from "./components/AppSkeleton.jsx";
import LicenseScreen from "./screens/LicenseScreen.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import Header from "./screens/Workspace/Header.jsx";
import ModalStack from "./screens/Workspace/ModalStack.jsx";

import { useToast } from "./hooks/useToast.js";
import { useSettings } from "./hooks/useSettings.js";
import { useLicense } from "./hooks/useLicense.js";
import { useAuth } from "./hooks/useAuth.js";
import { useMenu } from "./hooks/useMenu.js";
import { useBills } from "./hooks/useBills.js";
import { useCart } from "./hooks/useCart.js";
import { useHistory } from "./hooks/useHistory.js";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner.js";
import { useCustomers } from "./hooks/useCustomers.js";
import { useAdvancedData } from "./hooks/useAdvancedData.js";
import { loyalDiscountRules } from "./utilities/loyalty.js";
import { LOYALTY_TIER_BASIS, normalizeLoyaltyTierBasis } from "./constants/advancedFeatures.js";
import { useShiftCashFlow } from "./hooks/useShiftCashFlow.js";
import { row } from "./constants/design.js";
import { canAccessView, isAdmin } from "./utilities/permissions.js";

import ViewOpenBill from "./views/ViewOpenBill.jsx";
import ViewKasir from "./views/ViewKasir.jsx";
import ViewRiwayat from "./views/ViewRiwayat.jsx";
import ViewLaporan from "./views/ViewLaporan.jsx";
import ViewKelola from "./views/ViewKelola.jsx";
import ViewFiturLanjutan from "./views/ViewFiturLanjutan.jsx";
import CustomerPicker from "./components/CustomerPicker.jsx";

  import { useHistoryVoid } from "./hooks/useHistoryVoid.js";

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

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

// ─── MAIN APP (coordinator) ───────────────────────────────────────────────
function KasirWorkspace() {
  // ── Hooks: panggil semua di sini, App.jsx jadi satu-satunya tempat yang
  // tahu seluruh data flow antar domain. Tidak ada hook yang import hook lain.
  const toastH    = useToast();
  // historyRefreshRef & menuSetRef break declaration-order cycles: voidH is
  // declared before both historyH and menuH, but after a void it must be able
  // to reload history AND push the menu whose stock was just restored.
  const historyRefreshRef = useRef(null);
  const menuSetRef = useRef(null);
  // bahanUsageRef — bahan baku dipotong di renderer (resep+bahan ada di sini),
  // tetapi useCart dibuat SEBELUM useAdvancedData. Ref memutus siklus urutan
  // deklarasi itu (pola sama seperti historyRefreshRef/menuSetRef).
  const bahanUsageRef = useRef(null);
  const applyBahanUsage = useCallback((items, sign) => bahanUsageRef.current?.(items, sign), []);
  const voidH     = useHistoryVoid({
    toast_: toastH.toast_,
    addUndo: toastH.addUndo,
    applyBahanUsage,
    onVoided: (_id, menu) => {
      if (Array.isArray(menu) && menu.length) menuSetRef.current?.(menu);
      historyRefreshRef.current?.();
    },
  });
  const licenseH  = useLicense();
  const authH     = useAuth({ getNow, toast_: toastH.toast_ });
  const menuH     = useMenu({ toast_: toastH.toast_, addUndo: toastH.addUndo });
  menuSetRef.current = menuH.setMenu;
  const billsH    = useBills({ toast_: toastH.toast_, addUndo: toastH.addUndo, applyBahanUsage });
  const cartH     = useCart({
    toast_: toastH.toast_, getNow, receiptAdditionals: [], menu: menuH.menu,
    applyBahanUsage,
  });
  const historyH  = useHistory({ toast_: toastH.toast_, addUndo: toastH.addUndo, getNow, authH, applyBahanUsage });
  historyRefreshRef.current = historyH.refresh;
  const customersH = useCustomers({ toast_: toastH.toast_ });
  const advDataH = useAdvancedData({ toast_: toastH.toast_ });
  bahanUsageRef.current = advDataH.applyBahanUsage;
  // settingsH needs cartH to be defined first for onChange callback
  const settingsH = useSettings({ 
    toast_: toastH.toast_, 
    onChange: (newSettings) => {
      cartH.setReceiptAdditionals(newSettings.receiptAdditionals || []);
      cartH.setPricingConfig({
        discounts: newSettings.discounts || [],
        pajak: newSettings.pajak || { enabled: false, value: 0 },
        service: newSettings.service || { enabled: false, value: 0 },
      });
    }
  });

  // ── Navigasi (UI-level, tidak dimiliki domain manapun)
  const [view, setView] = useState("menu");
  // Info versi baru dari main process (lihat electron/update-check.cjs).
  // null = tidak ada update / belum dicek.
  const [updateInfo, setUpdateInfo] = useState(null);

  const navigate = useCallback((nextView) => {
    if (canAccessView(authH.currentUser, nextView)) setView(nextView);
    else toastH.toast_("Akses hanya tersedia untuk admin", "err");
  }, [authH.currentUser, toastH.toast_]);

  useEffect(() => {
    if (authH.currentUser && !canAccessView(authH.currentUser, view)) setView("menu");
    // Halaman Fitur Lanjutan ikut hilang saat saklar induk dimatikan — pindah
    // kembali ke kasir supaya user tidak terjebak di halaman kosong.
    if (view === "fitur-lanjutan" && !settingsH.settings.advancedFeatures?.enabled) setView("menu");
  }, [authH.currentUser, view]);

  // ── Total belanja kumulatif per pelanggan (untuk basis tier "lifetime").
  // Dimuat lewat IPC agregat agar tidak perlu memuat seluruh riwayat transaksi.
  // Dideklarasi SEBELUM efek loyalty di bawah yang memakainya (hindari TDZ).
  const [customerTotals, setCustomerTotals] = useState({});

  // ── Loyalty Tier → Diskon otomatis (Fase 1).
  // Basis tier bisa dipilih di Settings:
  //   - "transaction" (default): TOTAL TRANSAKSI SAAT INI (subtotal keranjang)
  //   - "lifetime": TOTAL BELANJA KUMULATIF pelanggan terpilih
  // Diskon otomatis diterapkan HANYA kalau: flag advancedFeatures.loyalty
  // menyala, pelanggan dipilih, dan tier punya diskon > 0. Rule di-scope
  // "global" sehingga dihitung calcPrice bersama diskon lain dari settings.
  // Baseline dipakai apa adanya (sebelum diskon) supaya tier tidak berubah
  // karena diskonnya sendiri (tidak ada feedback loop).
  useEffect(() => {
    const loyaltyOn = !!settingsH.settings.advancedFeatures?.loyalty;
    const customer = customersH.selectedCustomer;
    const basis = normalizeLoyaltyTierBasis(settingsH.settings.loyaltyTierBasis);
    const basisTotal = (basis === LOYALTY_TIER_BASIS.LIFETIME)
      ? (customerTotals[customer?.id] || 0)
      : cartH.subtotal;
    const baseDiscounts = settingsH.settings.discounts || [];
    const loyaltyRules = (loyaltyOn && customer)
      ? loyalDiscountRules(basisTotal, advDataH.loyaltyTiers)
      : [];
    cartH.setPricingConfig({
      discounts: [...baseDiscounts, ...loyaltyRules],
      pajak: settingsH.settings.pajak || { enabled: false, value: 0 },
      service: settingsH.settings.service || { enabled: false, value: 0 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settingsH.settings.advancedFeatures?.loyalty,
    settingsH.settings.discounts,
    settingsH.settings.pajak,
    settingsH.settings.service,
    settingsH.settings.loyaltyTierBasis,
    customersH.selectedCustomer,
    customerTotals,
    advDataH.loyaltyTiers,
    cartH.subtotal,
  ]);

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

  // ── Uang kas shift (opening cash) + pengeluaran (expenses)
  const {
    openingCashModal, setOpeningCashModal,
    openingCashInput, setOpeningCashInput,
    expenseModal, setExpenseModal,
    expenseForm, setExpenseForm,
    expenseCategoryDraft, setExpenseCategoryDraft,
    handleSaveOpeningCash,
    handleSkipOpeningCash,
    handleSaveExpense,
    expenseCategories,
    currentShiftExpenses,
    totalExpenses,
    openingCash,
  } = useShiftCashFlow({ authH, toastH, settingsH });

  // ── Shared login handler (button click + Enter key)
  const handleLogin = useCallback(async () => {
    if (!authH.loginForm.username || !authH.loginForm.password || showSnakeLoader) return;

    const ok = await authH.doLogin();
    if (!ok) return;

    setSnakeLoaderTrigger("login");
    setShowSnakeLoader(true);
    setLoginTransitioning(true);
    await new Promise(r => setTimeout(r, 1200));
    setShowSnakeLoader(false);
    setLoginTransitioning(false);
    setOpeningCashModal(true);
  }, [authH, showSnakeLoader])

  // ── Receipt & Pay modal — UI state yang menjembatani cart+history, tetap di App.jsx
  const [payModal, setPayModal] = useState(false);
  const [receipt, setReceipt]   = useState(null);
  const [printingPreview, setPrintingPreview] = useState(false);

  const [dataPath, setDataPath] = useState("");

  const logoRef   = settingsH.logoRef;
  const searchRef = useRef();
  useBarcodeScanner({
    menu: menuH.menu,
    search: menuH.search,
    setSearch: menuH.setSearch,
    setView,
    addToCart: cartH.addToCart,
    toast_: toastH.toast_,
  });

  // ── Cek license dulu sebelum load data
  useEffect(() => { licenseH.checkLicenseOnLoad(); }, []);

  // ── Info update: main process mengecek versi sekali saat app ready dan
  // mengirim event bila ada versi lebih baru. Gagal/kosong = tidak ada banner.
  useEffect(() => {
    window.kasirAPI?.checkUpdate?.()
      .then((info) => { if (info?.hasUpdate) setUpdateInfo(info); })
      .catch(() => {});
  }, []);

  // ── Load data (sekali saat mount) — distribusikan ke tiap hook
  useEffect(() => {
    (async () => {
      const [trxs, savedMenu, savedLogo, savedBills, savedCats, savedSettings, dp, savedShifts, savedUsers, savedCustomers, savedResep, savedBahanBaku, savedSupplier, savedLoyalty] = await Promise.all([
        api.loadTrx(), api.loadMenu(), api.loadLogo(), api.loadBills(),
        api.loadCats(), api.loadSettings(), api.getDataPath(), api.loadShifts(), api.loadUsers(), api.loadCustomers(),
        api.loadResep(), api.loadBahanBaku(), api.loadSupplier(), api.loadLoyaltyTiers(),
      ]);
      historyH.loadInitial(trxs, voidH.openVoidModal);
      menuH.loadInitial(savedMenu, savedCats);
      settingsH.loadInitial(savedLogo, savedSettings);
      billsH.loadInitial(savedBills);
      authH.loadInitial(savedShifts, savedUsers);
      customersH.loadInitial(savedCustomers);
        advDataH.loadInitial(savedResep, savedBahanBaku, savedSupplier, savedLoyalty);
      setDataPath(dp);
    })();
  }, []);

  // ── Muat total belanja kumulatif pelanggan (basis tier "lifetime").
  // Di-refresh setiap jumlah riwayat transaksi bertambah (mis. setelah bayar)
  // supaya tier pelanggan langsung mengikuti total terbaru.
  const loadCustomerTotalsMap = useCallback(async () => {
    try {
      const rows = (await api.loadCustomerTotals()) || [];
      const map = {};
      for (const r of rows) {
        if (!r?.customerId) continue;
        map[r.customerId] = Number(r.total) || 0;
      }
      setCustomerTotals(map);
    } catch {
      /* biarkan kosong — tier basis lifetime jatuh ke 0 / Bronze */
    }
  }, []);

  useEffect(() => { loadCustomerTotalsMap(); }, [loadCustomerTotalsMap, historyH.history.length]);

  // ── Hotkeys
  useEffect(() => {
    const handler = (e) => {
      const tagName = e.target.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      switch (e.key.toUpperCase()) {
        case "K": navigate("menu"); break;
        case "O": navigate("bills"); break;
        case "R": navigate("history"); break;
        case "L": navigate("laporan"); break;
        case "M": navigate("kelola"); break;
        case "F": navigate("fitur-lanjutan"); break;
        case "P": cartH.setDrawerOpen(d => !d); break;
        case "/": e.preventDefault(); navigate("menu"); setTimeout(() => searchRef.current?.focus(), 80); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // ── Wiring lintas-hook (pengganti fungsi lama yang dulu di satu scope)
  // Semua dibungkus useCallback supaya stabil sebagai props ke views/ yang
  // di-React.memo() — tanpa ini, fungsi-fungsi ini selalu jadi reference
  // baru tiap render App.jsx, dan memo di child jadi tidak efektif.

  // saveOpenBill butuh bills/billId/persistBills dari useBills (parameter, bukan import)
  const saveOpenBill = useCallback(() => cartH.saveOpenBill({
    bills: billsH.bills, billId: billsH.billId,
    persistBills: billsH.persistBills, setBillId: billsH.setBillId,
    applyStockView: menuH.applyStockView, // Langkah 2: patch view dari { stock } IPC
    customer: customersH.selectedCustomer, // denormalized into the open bill
  }), [cartH.saveOpenBill, billsH.bills, billsH.billId, billsH.persistBills, billsH.setBillId, menuH.applyStockView, customersH.selectedCustomer]);

  // processPayment butuh potongan dari useHistory, useMenu, useAuth, useBills
  // FIX: Use cartH.activeBill?.id directly to avoid race condition with setTimeout
  const processPayment = useCallback(() => cartH.processPayment({
    generateTrxId: historyH.generateTrxId,
    activeShift: authH.activeShift,
    applyStockView: menuH.applyStockView, // Langkah 2: patch view dari { stock } IPC
    // clearCart() also clears the customer selection — a finished sale must not
    // leak the member of the previous customer into the next order.
    appendHistory: (trx) => { historyH.appendHistory(trx); setReceipt(trx); setPayModal(false); cartH.setDrawerOpen(false); cartH.clearCart(); customersH.setSelectedCustomerId(null); },
    removeBillLocal: billsH.removeBillLocal,
    billIdToClose: cartH.activeBill?.id,     // Use activeBill directly instead of ref
    paymentMethods: settingsH.settings.paymentMethods || [], // NEW: payment methods for label resolution
    customer: customersH.selectedCustomer, // GAP 5: denormalized into trx for receipt
  }), [
    cartH.processPayment, historyH.generateTrxId, authH.activeShift,
    menuH.applyStockView, historyH.appendHistory,
    cartH.setDrawerOpen, cartH.clearCart, billsH.removeBillLocal,
    settingsH.settings.paymentMethods, // NEW deps
    customersH.selectedCustomer, // GAP 5
    customersH.setSelectedCustomerId, // GAP 5
  ]);

  // confirmCloseShift butuh clearCart saja — clearBills DIHAPUS
  // Open bill TIDAK PERNAH dihapus otomatis saat tutup shift
  // (hanya dihapus jika sudah dibayar via processPayment -> removeBillLocal)
  const confirmCloseShift = useCallback(() => authH.confirmCloseShift({
    clearCart: cartH.clearCart,
  }), [authH.confirmCloseShift, cartH.clearCart]);

 // printReceipt(trx) — thermal fisik pakai ESC/POS langsung (bypass driver Windows),
// printer PDF virtual (mis. "Microsoft Print to PDF") tetap lewat buildReceiptHTML + printToPDF.
const printReceipt = useCallback(async (trx) => {
  const printerName = settingsH.settings.printerName || "";
  const selection = getPrinterSelectionStatus(printerName);

  if (selection.isThermal) {
    const res = await window.api.printReceiptEscPos({
      trx,
      printerName,
      paperWidthMm: settingsH.settings.receiptPaperWidthMm,
      warungName: settingsH.settings.warungName,
      warungAddress: settingsH.settings.warungAddress,
      warungPhone: settingsH.settings.warungPhone,
      operatorName: trx.operator,
      cats: menuH.cats,
      customerEnabled: settingsH.settings.customerEnabled !== false,
    });
    if (res?.ok) toastH.toast_("Selesai Mencetak Resi", "ok");
    else toastH.toast_(res?.error || "Gagal cetak thermal", "err");
    return res;
  }

  if (selection.isPdf) {
    const html = buildReceiptHTML(trx, settingsH.logo, settingsH.settings.receiptAdditionals, settingsH.settings.qrisImages, settingsH.settings.warungName, menuH.cats, settingsH.settings.warungAddress, settingsH.settings.warungPhone, settingsH.settings.paymentMethods, settingsH.settings.receiptPaperWidthMm, settingsH.settings.customerEnabled !== false, settingsH.settings.receiptHeaderText, settingsH.settings.receiptFooterText);
    const res = await settingsH.printHTML(html, "Selesai Mencetak Resi");
    return res;
  }

  const html = buildReceiptHTML(trx, settingsH.logo, settingsH.settings.receiptAdditionals, settingsH.settings.qrisImages, settingsH.settings.warungName, menuH.cats, settingsH.settings.warungAddress, settingsH.settings.warungPhone, settingsH.settings.paymentMethods, settingsH.settings.receiptPaperWidthMm, settingsH.settings.customerEnabled !== false, settingsH.settings.receiptHeaderText, settingsH.settings.receiptFooterText);
  const res = await settingsH.printHTML(html, "Selesai Mencetak Resi");
  return res;
}, [settingsH.logo, settingsH.printHTML, settingsH.settings.printerName, settingsH.settings.receiptAdditionals, settingsH.settings.qrisImages, settingsH.settings.warungName, settingsH.settings.warungAddress, settingsH.settings.warungPhone, menuH.cats, settingsH.settings.paymentMethods, settingsH.settings.receiptPaperWidthMm, settingsH.settings.customerEnabled, settingsH.settings.receiptHeaderText, settingsH.settings.receiptFooterText, toastH.toast_]);

  // printPreview — depend ke cart (items/receiptAdditionalValues), pakai printHTML generic dari settings
  // PENTING: membaca cartH.items/receiptAdditionalValues dan settingsH.logo langsung. Semua wajib di deps.
  const printPreview = useCallback(async () => {
    if (!cartH.items.length) { toastH.toast_("Isi pesanan dulu", "err"); return; }
    setPrintingPreview(true);
    try {
      const html = buildPreviewHTML(cartH.receiptAdditionalValues, cartH.items, settingsH.logo, settingsH.settings.receiptAdditionals, settingsH.settings.warungName, menuH.cats, settingsH.settings.warungAddress, settingsH.settings.warungPhone, settingsH.settings.receiptPaperWidthMm, cartH.pricingConfig, cartH.paidNum, cartH.metode, settingsH.settings.receiptHeaderText, settingsH.settings.receiptFooterText);
      await settingsH.printHTML(html, "Mencetak preview tagihan...");
    } finally {
      setPrintingPreview(false);
    }
  }, [cartH.items, cartH.receiptAdditionalValues, cartH.pricingConfig, cartH.paidNum, cartH.metode, toastH.toast_, settingsH.logo, settingsH.printHTML, settingsH.settings.receiptAdditionals, settingsH.settings.warungName, settingsH.settings.warungAddress, settingsH.settings.warungPhone, menuH.cats, settingsH.settings.receiptPaperWidthMm, settingsH.settings.receiptHeaderText, settingsH.settings.receiptFooterText]);

  // loadBillToCart (wrapped) — selain mengisi cart, juga memulihkan pelanggan
  // yang tersimpan di bill. useCart.loadBillToCart sengaja tetap "murni"
  // (hanya cart) karena customers dimiliki useCustomers, bukan useCart.
  // Memulihkan customer di sini menjaga satu sumber kebenaran (App.jsx).
  const loadBillToCart = useCallback((bill) => {
    cartH.loadBillToCart(bill);
    customersH.setSelectedCustomerId(bill?.customerId || null);
  }, [cartH.loadBillToCart, customersH.setSelectedCustomerId]);

  // Dipanggil dari tombol "Bayar" di Open Bill view — pola setTimeout
  // DIPERTAHANKAN PERSIS dari kode asli (lihat catatan di useCart.js bagian
  // atas perihal bug race condition yang belum di-root-cause).
  const loadBillAndPay = useCallback((bill) => {
    loadBillToCart(bill);
    navigate("menu");
    setTimeout(() => setPayModal(true), 300);
  }, [loadBillToCart, navigate]);

  // confirmDel dispatcher — menggantikan switch-case yang dulu inline di modal konfirmasi
  // PENTING: membaca confirmDel langsung dari closure. Wajib di deps, atau
  // dispatcher akan selalu mengeksekusi confirmDel dari render pertama (null).
const executeConfirmDel = useCallback((restoreStock = false) => {
    if (!confirmDel) return;
    if (!isAdmin(authH.currentUser) && ["all", "trx", "allBills", "bill", "allMenu", "item"].includes(confirmDel.type)) {
      toastH.toast_("Hanya admin yang dapat melakukan tindakan ini", "err");
      setConfirmDel(null);
      return;
    }
    // Langkah 2b: tipe trx/all menerima opsi restoreStock. applyStockView
    // dipakai untuk mem-patch tampilan stok setelah main mengembalikan peta.
    if (confirmDel.type === "all") historyH.clearAllTrx({ restoreStock, applyStockView: menuH.applyStockView });
    else if (confirmDel.type === "trx") historyH.deleteTrx(confirmDel.id, { restoreStock, applyStockView: menuH.applyStockView });
    else if (confirmDel.type === "allBills") billsH.clearAllBills();
    else if (confirmDel.type === "bill") {
      // For open bills, cancel and restore stock
      billsH.cancelBill(confirmDel.id, {
        applyStockView: menuH.applyStockView, // Langkah 2: stok via api.applyStock
      });
    }
    else if (confirmDel.type === "allMenu") menuH.clearAllMenu();   // ← new, must be explicit
    else menuH.deleteItem(confirmDel.id);
    setConfirmDel(null);
  }, [confirmDel, authH.currentUser, toastH.toast_, historyH.clearAllTrx, historyH.deleteTrx, billsH.clearAllBills, billsH.cancelBill, menuH.applyStockView, menuH.clearAllMenu, menuH.deleteItem]);
 
  const at = historyH.at;
  const doCSV = historyH.doCSV;

  const showLicenseScreen = licenseH.licenseStatus !== null && (!licenseH.licenseStatus.valid || licenseTransitioning);
  const showLoginScreen = licenseH.licenseStatus !== null && (!authH.activeShift || loginTransitioning);

  let content;

  if (licenseH.licenseStatus === null) {
    content = <AppSkeleton />;
  } else if (showLicenseScreen) {
    content = (
      <LicenseScreen
        licenseH={licenseH}
        showSnakeLoader={showSnakeLoader}
        snakeLoaderTrigger={snakeLoaderTrigger}
        setShowSnakeLoader={setShowSnakeLoader}
        setSnakeLoaderTrigger={setSnakeLoaderTrigger}
        setLicenseTransitioning={setLicenseTransitioning}
      />
    );
  } else if (showLoginScreen) {
    content = (
      <LoginScreen
        authH={authH}
        settingsH={settingsH}
        handleLogin={handleLogin}
        showPw={showPw}
        setShowPw={setShowPw}
        showSnakeLoader={showSnakeLoader}
        snakeLoaderTrigger={snakeLoaderTrigger}
      />
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

      <Header
        settingsH={settingsH}
        authH={authH}
        billsH={billsH}
        historyH={historyH}
        view={view}
        navigate={navigate}
        logoRef={logoRef}
      />

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>


        {/* ══════ MENU VIEW ════════════════════════════════════════════════ */}
        {view==="menu" && (
          <ViewKasir
            allCats={menuH.allCats} kategori={menuH.kategori} setKategori={menuH.setKategori}
            search={menuH.search} setSearch={menuH.setSearch} displayMenu={menuH.displayMenu} cats={menuH.cats}
            cart={cartH.cart} drawerOpen={cartH.drawerOpen} setDrawerOpen={cartH.setDrawerOpen}
            receiptAdditionalValues={cartH.receiptAdditionalValues} receiptAdditionals={cartH.receiptAdditionals} updateReceiptAdditionalValue={cartH.updateReceiptAdditionalValue}
            customerPicker={<CustomerPicker customers={customersH.customers} selectedCustomer={customersH.selectedCustomer} setSelectedCustomerId={customersH.setSelectedCustomerId} upsertCustomer={customersH.upsertCustomer} />}
            customerEnabled={settingsH.settings.customerEnabled !== false}
            loyaltyTier={
              (settingsH.settings.advancedFeatures?.loyalty && customersH.selectedCustomer)
                ? advDataH.tierForTotal(
                    normalizeLoyaltyTierBasis(settingsH.settings.loyaltyTierBasis) === LOYALTY_TIER_BASIS.LIFETIME
                      ? (customerTotals[customersH.selectedCustomer?.id] || 0)
                      : cartH.subtotal,
                    advDataH.loyaltyTiers,
                  )
                : null
            }
            items={cartH.items} subtotal={cartH.subtotal} service={cartH.service} discount={cartH.discount}
            pajak={cartH.pajak} total={cartH.total} activeBill={cartH.activeBill}
            addToCart={cartH.addToCart} decCart={cartH.decCart} delCart={cartH.delCart} clearCart={cartH.clearCart} setUnit={cartH.setUnit}
            saveOpenBill={saveOpenBill} printPreview={printPreview} printingPreview={printingPreview} setPayModal={setPayModal}
            searchRef={searchRef}
            checkRequiredAdditionals={cartH.checkRequiredAdditionals}
            stockErrors={cartH.stockErrors}
          />
        )}


        {/* ══════ OPEN BILL VIEW ══════════════════════════════════════════ */}
        {view==="bills"&&(
          <ViewOpenBill
            bills={billsH.bills}
            loadBillToCart={loadBillToCart}
            setView={setView}
            loadBillAndPay={loadBillAndPay}
            setConfirmDel={setConfirmDel}
            settingsH={settingsH}
            pricingConfig={cartH.pricingConfig}
            customerEnabled={settingsH.settings.customerEnabled !== false}
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
            canDelete={isAdmin(authH.currentUser)}
            canVoid={isAdmin(authH.currentUser)}
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
            voidProps={{ isVoiding: voidH.isVoiding, voidTrx: voidH.voidTrx, openVoidModal: voidH.openVoidModal }} />
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
            loadAllForReport={historyH.loadAllForReport}
            paymentMethods={settingsH.settings.paymentMethods}            expenseCategories={settingsH.settings.expenseCategories || []}
            openingCash={openingCash}
            totalExpenses={totalExpenses}
            onOpenExpenseModal={() => setExpenseModal(true)}
            onOpenCashModal={() => setOpeningCashModal(true)} advancedFeatures={settingsH.settings.advancedFeatures} isAdvancedActive={settingsH.isAdvancedActive} warungName={settingsH.settings.warungName} warungAddress={settingsH.settings.warungAddress} warungPhone={settingsH.settings.warungPhone} currentUser={authH.currentUser} toast_={toastH.toast_}
              advancedData={advDataH} />
        )}

        {/* ══════ KELOLA MENU VIEW ════════════════════════════════════════ */}
        {view==="kelola" && isAdmin(authH.currentUser) && (
          <ViewKelola
            menu={menuH.menu} cats={menuH.cats} allCats={menuH.allCats}
            setCatModal={menuH.setCatModal} openAdd={menuH.openAdd} openEdit={menuH.openEdit}
            applyStockView={menuH.applyStockView}
            setConfirmDel={setConfirmDel}
            search={menuH.search} setSearch={menuH.setSearch}
            lowStockThreshold={Number(settingsH.settings.lowStockThreshold) > 0 ? Number(settingsH.settings.lowStockThreshold) : undefined}
              advancedFeatures={settingsH.settings.advancedFeatures} isAdvancedActive={settingsH.isAdvancedActive}
              advancedData={advDataH}
              toast_={toastH.toast_}
            />
        )}

        {/* ══════ FITUR LANJUTAN VIEW ═════════════════════════════════════ */}
        {view==="fitur-lanjutan" && isAdmin(authH.currentUser) && settingsH.settings.advancedFeatures?.enabled && (
          <ViewFiturLanjutan
            menu={menuH.menu} cats={menuH.cats}
            advancedData={advDataH}
            settings={settingsH.settings}
            toast_={toastH.toast_}
            onImported={menuH.refreshFromStore}
          />
        )}
      </div>

      {/* FOOTER */}
      <footer style={{background:W,borderTop:`1px solid ${BD}`,padding:"3px 16px",...row,flexShrink:0}}>
        <span style={{fontSize:9,color:MT}}>Terima kasih berkunjung ke <span style={{color:OR,fontWeight:600}}>{settingsH.settings.warungName || "Warung"}</span></span>
        {dataPath&&<span style={{fontSize:8,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>{dataPath}</span>}
        <span style={{fontSize:9,color:MT}}>v3.0.0</span>
      </footer>

      <ModalStack
        payModal={payModal}
        cartH={cartH}
        processPayment={processPayment}
        setPayModal={setPayModal}
        settingsH={settingsH}
        voidH={voidH}
        authH={authH}
        receipt={receipt}
        printReceipt={printReceipt}
        setReceipt={setReceipt}
        menuH={menuH}
        confirmCloseShift={confirmCloseShift}
        openingCashModal={openingCashModal}
        openingCashInput={openingCashInput}
        setOpeningCashInput={setOpeningCashInput}
        handleSkipOpeningCash={handleSkipOpeningCash}
        handleSaveOpeningCash={handleSaveOpeningCash}
        expenseModal={expenseModal}
        setExpenseModal={setExpenseModal}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        expenseCategories={expenseCategories}
        expenseCategoryDraft={expenseCategoryDraft}
        setExpenseCategoryDraft={setExpenseCategoryDraft}
        handleSaveExpense={handleSaveExpense}
        confirmDel={confirmDel}
        setConfirmDel={setConfirmDel}
        executeConfirmDel={executeConfirmDel}
        toastH={toastH}
        updateInfo={updateInfo}
        setUpdateInfo={setUpdateInfo}
      />
    </div>
    );
  }

  return content;
}

export default function Kasir() {
  return <KasirWorkspace />;
}
