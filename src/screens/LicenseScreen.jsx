import { useState } from "react";
import { G, W, LT, BD, MT } from "../constants/design.js";
import { SnakeLoader } from "../components/SnakeLoader.jsx";
import JoinHostModal from "../components/modals/JoinHostModal.jsx";
import { useLicenseHost } from "../hooks/useLicenseHost.js";

export default function LicenseScreen({
  licenseH,
  showSnakeLoader,
  snakeLoaderTrigger,
  setShowSnakeLoader,
  setSnakeLoaderTrigger,
  setLicenseTransitioning,
}) {
  const [showJoin, setShowJoin] = useState(false);
  const hostH = useLicenseHost();

  return (
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
          <input id="license-key" name="licenseKey" autoFocus value={licenseH.licKey} onChange={e=>{licenseH.setLicKey(e.target.value.toUpperCase());licenseH.setLicErr("");}}
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

        {/* Fase 2: aktivasi-via-host — jalur kedua, di bawah aktivasi manual. */}
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0 14px"}}>
          <div style={{flex:1,height:1,background:BD}} />
          <div style={{fontSize:10,color:MT,fontWeight:600}}>ATAU</div>
          <div style={{flex:1,height:1,background:BD}} />
        </div>
        <button
          onClick={()=>setShowJoin(true)}
          disabled={!hostH.available}
          title={hostH.available?"":"Hanya tersedia di aplikasi desktop (Electron)"}
          style={{width:"100%",padding:12,background:W,color:hostH.available?G:MT,border:`1.5px solid ${BD}`,borderRadius:9,cursor:hostH.available?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
        >
          🔗 Aktifkan Aplikasi Melalui Device Lain
        </button>
        {!hostH.available && (
          <div style={{textAlign:"center",marginTop:8,fontSize:10,color:MT}}>Fitur ini hanya tersedia di aplikasi desktop.</div>
        )}
      </div>

      <JoinHostModal
        open={showJoin}
        onClose={()=>setShowJoin(false)}
        hostH={hostH}
        onApproved={()=>{ /* Fase 3: reload memakai snapshot Host */ }}
      />
    </div>
  );
}
