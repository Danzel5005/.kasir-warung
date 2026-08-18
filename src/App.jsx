import { useState, useEffect, useRef, useCallback } from "react";
import { METODE_LABELS} from "./constants/payments.js";
import { G, OR, W, LT, BD, TX, MT } from "./constants/colors.js";
import { buildReceiptHTML, buildPreviewHTML, fmt } from "./utilities/receipt.js";
import { api } from "./utilities/utils.js";
import { row } from "./constants/styles.js";
import { ClockBadge } from "./components/ClockBadge.jsx";

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
import UserModal from "./components/modals/UserModal.jsx";

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
export default function Kasir() {
  // ── Hooks: panggil semua di sini, App.jsx jadi satu-satunya tempat yang
  // tahu seluruh data flow antar domain. Tidak ada hook yang import hook lain.
  const toastH    = useToast();
  const settingsH = useSettings({ toast_: toastH.toast_ });
  const licenseH  = useLicense();
  const authH     = useAuth({ getNow, toast_: toastH.toast_ });
  const menuH     = useMenu({ toast_: toastH.toast_, addUndo: toastH.addUndo });
  const billsH    = useBills({ toast_: toastH.toast_, addUndo: toastH.addUndo });
  const cartH     = useCart({ toast_: toastH.toast_, getNow, receiptAdditionals: settingsH.settings.receiptAdditionals || [] });
  const historyH  = useHistory({ toast_: toastH.toast_, addUndo: toastH.addUndo, getNow });

  // ── Navigasi (UI-level, tidak dimiliki domain manapun)
  const [view, setView] = useState("menu");

  // ── confirmDel: SENGAJA tetap di App.jsx, bukan di salah satu hook.
  // Dipakai lintas domain (hapus trx/bill/item/kategori) dengan shape
  // {type, id}. Memilikinya di satu hook tertentu akan membuat hook itu
  // harus tahu tentang domain lain (melanggar constraint "no cross-hook
  // import") — jadi dia tinggal di coordinator level.
  const [confirmDel, setConfirmDel] = useState(null);

  // ── User management modal
  const [userModal, setUserModal] = useState(false);

  // ── Receipt & Pay modal — UI state yang menjembatani cart+history, tetap di App.jsx
  const [payModal, setPayModal] = useState(false);
  const [receipt, setReceipt]   = useState(null);
  const [printingPreview, setPrintingPreview] = useState(false);

  const [dataPath, setDataPath] = useState("");

  const logoRef   = settingsH.logoRef;
  const photoRef  = useRef();
  const searchRef = useRef();

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
  }), [cartH.saveOpenBill, billsH.bills, billsH.billId, billsH.persistBills, billsH.setBillId]);

  // processPayment butuh potongan dari useHistory, useMenu, useAuth, useBills
  const processPayment = useCallback(() => cartH.processPayment({
    trxId: historyH.trxId, setTrxId: historyH.setTrxId,
    activeShift: authH.activeShift,
    computeStockDeduction: menuH.computeStockDeduction,
    commitMenu: menuH.setMenu,
    appendHistory: (trx) => { historyH.appendHistory(trx); setReceipt(trx); setPayModal(false); cartH.setDrawerOpen(false); },
    removeBillLocal: billsH.removeBillLocal,
  }), [
    cartH.processPayment, historyH.trxId, historyH.setTrxId, authH.activeShift,
    menuH.computeStockDeduction, menuH.setMenu, historyH.appendHistory,
    cartH.setDrawerOpen, billsH.removeBillLocal,
  ]);

  // confirmCloseShift butuh clearBills (silent, sesuai perilaku asli) + clearCart
  const confirmCloseShift = useCallback(() => authH.confirmCloseShift({
    clearBills: billsH.clearBillsSilent,
    clearCart: cartH.clearCart,
  }), [authH.confirmCloseShift, billsH.clearBillsSilent, cartH.clearCart]);

  // printReceipt(trx) — generic, dari useSettings.printHTML + buildReceiptHTML
  // PENTING: membaca settingsH.logo langsung. Wajib di deps.
  const printReceipt = useCallback(async (trx) => {
    const html = buildReceiptHTML(trx, settingsH.logo, settingsH.settings.receiptAdditionals);
    await settingsH.printHTML(html, "Mencetak resi...");
  }, [settingsH.logo, settingsH.printHTML, settingsH.settings.receiptAdditionals]);

  // printPreview — depend ke cart (items/tableNum/pax), pakai printHTML generic dari settings
  // PENTING: membaca cartH.items/tableNum/pax dan settingsH.logo langsung. Semua wajib di deps.
  const printPreview = useCallback(async () => {
    if (!cartH.items.length || !cartH.tableNum.trim()) { toastH.toast_("Isi meja dan pesanan dulu", "err"); return; }
    setPrintingPreview(true);
    try {
      const html = buildPreviewHTML(cartH.tableNum.trim(), cartH.pax, cartH.items, settingsH.logo, settingsH.settings.receiptAdditionals);
      await settingsH.printHTML(html, "Mencetak preview tagihan...");
    } finally {
      setPrintingPreview(false);
    }
  }, [cartH.items, cartH.tableNum, cartH.pax, toastH.toast_, settingsH.logo, settingsH.printHTML, settingsH.settings.receiptAdditionals]);

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
    else if (confirmDel.type === "bill") billsH.closeBill(confirmDel.id);
    else if (confirmDel.type === "allMenu") menuH.clearAllMenu();   // ← new, must be explicit
    else menuH.deleteItem(confirmDel.id);
    setConfirmDel(null);
  }, [confirmDel, historyH.clearAllTrx, historyH.deleteTrx, billsH.clearAllBills, billsH.closeBill, menuH.clearAllMenu, menuH.deleteItem]);
 
  const at = historyH.at;
  const doCSV = historyH.doCSV;

  // ─── LOADING ──────────────────────────────────────────────────────────────────
  if(licenseH.licenseStatus===null) return <AppSkeleton />;

  // ─── AKTIVASI LICENSE ─────────────────────────────────────────────────────────
  if(!licenseH.licenseStatus.valid){
    return(
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:W,borderRadius:18,padding:"36px 32px",width:400,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:64,height:64,background:G,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 12px"}}>🔑</div>
            <div style={{fontSize:18,fontWeight:700,color:G}}>Aktivasi Software</div>
            <div style={{fontSize:11,color:MT,marginTop:3}}>Software Kasir</div>
          </div>

          {/* Hardware ID */}
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

          {/* Input key */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:MT,fontWeight:600,display:"block",marginBottom:5}}>LICENSE KEY</label>
            <input autoFocus value={licenseH.licKey} onChange={e=>{licenseH.setLicKey(e.target.value.toUpperCase());licenseH.setLicErr("");}}
              onKeyDown={e=>e.key==="Enter"&&licenseH.doActivate()}
              placeholder="YKK-XXXXX-XXXXX-XXXXX-XXXXX"
              style={{width:"100%",padding:"11px 13px",boxSizing:"border-box",border:`1.5px solid ${licenseH.licErr?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"monospace",letterSpacing:1,outline:"none",background:licenseH.licErr?"#fff5f5":W}}
            />
            {licenseH.licErr&&<div style={{color:"#e84040",fontSize:11,fontWeight:600,marginTop:5}}>❌ {licenseH.licErr}</div>}
          </div>
          <button onClick={licenseH.doActivate} disabled={!licenseH.licKey.trim()||licenseH.licLoad}
            style={{width:"100%",padding:13,background:licenseH.licKey.trim()&&!licenseH.licLoad?G:"#aaa",color:W,border:"none",borderRadius:9,cursor:licenseH.licKey.trim()&&!licenseH.licLoad?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
            {licenseH.licLoad?"Memvalidasi...":"Aktifkan Software"}
          </button>
          <div style={{textAlign:"center",marginTop:16,fontSize:10,color:MT,lineHeight:1.7}}>
            License terikat ke perangkat ini.<br/>Pindah PC? Hubungi penjual untuk reset aktivasi.
          </div>
        </div>
      </div>
    );
  }

  // ─── LOGIN / START SHIFT SCREEN ─────────────────────────────────────────────
  if(!authH.activeShift) return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${G} 0%,#0f3d24 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:W,borderRadius:18,padding:"36px 32px",width:360,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.4)"}}>
        {/* Logo & Judul */}
        <div style={{textAlign:"center",marginBottom:28}}>
          {settingsH.logo?<img src={settingsH.logo} alt="logo" style={{width:64,height:64,borderRadius:12,objectFit:"cover",marginBottom:10}}/>
          :<div style={{width:64,height:64,background:G,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:W,margin:"0 auto 10px"}}>YKK</div>}
          <div style={{fontSize:18,fontWeight:700,color:G}}>Restaurant</div>
          <div style={{fontSize:12,color:MT,marginTop:2}}>Sistem Kasir — Mulai Shift</div>
        </div>

        {/* Info shift terakhir */}
        {authH.shifts.filter(s=>s.status==="closed").slice(-1).map(s=>(
          <div key={s.id} style={{background:"#e8f5ee",border:"1px solid #a8d5b8",borderRadius:8,padding:"9px 12px",marginBottom:16,fontSize:10,color:"#1a5c38"}}>
            <b>Shift terakhir:</b> Shift {s.shiftNum} · {s.hari} {s.tgl} {s.bln} {s.thn} · {s.startJam}–{s.endJam||"?"} · {s.operator}
          </div>
        ))}

        {/* Form login */}
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
          <input
            id="pw-input"
            type="password" value={authH.loginForm.password}
            onChange={e=>authH.setLoginForm(f=>({...f,password:e.target.value,error:""}))}
            onKeyDown={e=>e.key==="Enter"&&authH.doLogin()}
            placeholder="Masukkan password..."
            style={{width:"100%",padding:"10px 12px",boxSizing:"border-box",border:`1.5px solid ${authH.loginForm.error?"#e84040":BD}`,borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none"}}
          />
        </div>
        {authH.loginForm.error&&<div style={{color:"#e84040",fontSize:11,fontWeight:600,marginBottom:10,textAlign:"center"}}>{authH.loginForm.error}</div>}
        <button
          onClick={authH.doLogin}
          disabled={!authH.loginForm.username||!authH.loginForm.password}
          style={{width:"100%",padding:"12px",background:authH.loginForm.username&&authH.loginForm.password?G:"#aaa",color:W,border:"none",borderRadius:9,cursor:authH.loginForm.username&&authH.loginForm.password?"pointer":"not-allowed",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"background 0.2s"}}
        >Mulai Shift</button>

        {/* Riwayat shift */}
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

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
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
        <div onClick={()=>logoRef.current.click()} title="Klik untuk upload logo" style={{width:38,height:38,borderRadius:7,overflow:"hidden",border:`2px dashed ${settingsH.logo?G:BD}`,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:settingsH.logo?"transparent":LT}}>
          {settingsH.logo?<img src={settingsH.logo} alt="logo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:9,color:MT}}>Logo</span>}
        </div>
        <input ref={logoRef} type="file" accept=".jpg,.jpeg,.png" style={{display:"none"}} onChange={settingsH.handleLogoUpload}/>
        <div style={{flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:700,color:G}}>Sistem Kasir</div>
          <div style={{fontSize:9,color:OR,fontWeight:600}}>Restaurant</div>
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
            tableNum={cartH.tableNum} setTableNum={cartH.setTableNum}
            pax={cartH.pax} setPax={cartH.setPax}
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
          />
        )}


        {/* ══════ HISTORY VIEW ════════════════════════════════════════════ */}
        {view==="history"&&(
          <ViewRiwayat
            fFrom={historyH.fFrom} setFFrom={historyH.setFFrom}
            fTo={historyH.fTo} setFTo={historyH.setFTo}
            filteredHistory={historyH.filteredHistory}
            history={historyH.history}
            histByDay={historyH.histByDay}
            expandedDays={historyH.expandedDays} setExpandedDays={historyH.setExpandedDays}
            doCSV={doCSV} at={at}
            setConfirmDel={setConfirmDel}
            setReceipt={setReceipt}
            // New: shift-based view
            viewMode={historyH.viewMode} setViewMode={historyH.setViewMode}
            shiftIdFilter={historyH.shiftIdFilter} setShiftIdFilter={historyH.setShiftIdFilter}
            histByShift={historyH.histByShift}
            shifts={authH.shifts}
          />
        )}

        {/* ══════ LAPORAN VIEW ════════════════════════════════════════════ */}
        {view==="laporan"&&(
          <ViewLaporan
            selectedShiftId={authH.selectedShiftId} setSelectedShiftId={authH.setSelectedShiftId}
            shifts={authH.shifts} activeShift={authH.activeShift}
            history={historyH.history}
            menu={menuH.menu}
            doCSV={doCSV} at={at}
          />
        )}

        {/* ══════ KELOLA MENU VIEW ════════════════════════════════════════ */}
        {view==="kelola"&&(
          <ViewKelola
            menu={menuH.menu} cats={menuH.cats} allCats={menuH.allCats}
            setCatModal={menuH.setCatModal} openAdd={menuH.openAdd} openEdit={menuH.openEdit}
            setConfirmDel={setConfirmDel}
            setUserModal={setUserModal}
          />
        )}
      </div>

      {/* FOOTER */}
      <footer style={{background:W,borderTop:`1px solid ${BD}`,padding:"3px 16px",...row,flexShrink:0}}>
        <span style={{fontSize:9,color:MT}}>Terima kasih berkunjung ke <span style={{color:OR,fontWeight:600}}>Restaurant</span></span>
        {dataPath&&<span style={{fontSize:8,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",maxWidth:300}}>{dataPath}</span>}
        <span style={{fontSize:9,color:MT}}>v3.0.0</span>
      </footer>

      {/* ══ MODAL: PEMBAYARAN ══════════════════════════════════════════════ */}
      {payModal && (
        <PayModal cartH={cartH} processPayment={processPayment} setPayModal={setPayModal} paymentMethods={settingsH.settings.paymentMethods} receiptAdditionals={settingsH.settings.receiptAdditionals} />
      )}

      {/* ══ MODAL: RESI (klik transaksi atau setelah bayar) ════════════════ */}
      {receipt && (
        <ReceiptModal receipt={receipt} logo={settingsH.logo} printReceipt={printReceipt} setReceipt={setReceipt} receiptAdditionals={settingsH.settings.receiptAdditionals} />
      )}

      {/* ══ MODAL: TAMBAH/EDIT MENU ════════════════════════════════════════ */}
      {menuH.itemModal && (
        <ItemModal menuH={menuH} photoRef={photoRef} />
      )}

      {/* ══ MODAL: KELOLA KATEGORI ════════════════════════════════════════ */}
      {menuH.catModal && (
        <CatModal menuH={menuH} />
      )}

      {/* ══ MODAL: SETTINGS (PRINTER & PAYMENT) ════════════════════════════ */}
      {settingsH.settingsModal && (
        <SettingsModal settingsH={settingsH} />
      )}

      {/* ══ MODAL: PRINTER (Legacy, kept for backward compatibility) ════════ */}
      {settingsH.printerModal && (
        <PrinterModal settingsH={settingsH} />
      )}

      {/* ══ MODAL: KONFIRMASI TUTUP SHIFT ════════════════════════════════ */}
      {authH.closingShift && (
        <CloseShiftModal authH={authH} confirmCloseShift={confirmCloseShift} />
      )}

      {/* ══ MODAL: KONFIRMASI HAPUS ════════════════════════════════════════ */}
      {confirmDel && (
        <ConfirmDelModal confirmDel={confirmDel} setConfirmDel={setConfirmDel} executeConfirmDel={executeConfirmDel} />
      )}

      {/* ══ MODAL: KELOLA PENGGUNA ════════════════════════════════════════ */}
      {userModal && (
        <UserModal authH={authH} setUserModal={setUserModal} />
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
