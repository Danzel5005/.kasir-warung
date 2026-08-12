import { memo } from "react";
import { csvByDay, TRX_HEADER, trxRow, csvLaporan, csvSalesRate, csvPerMenu, csvMetodeBayar } from "../utilities/csvbuild.js";
import { fmt, fmtNum } from "../utilities/receipt.js";
import { METODE_LABELS } from "../constants/payments.js";
import { G, OR, W, LT, BD, TX, MT, METODE_COLORS } from "../constants/colors.js";

// ViewLaporan — laporan keuangan & penjualan per shift, dengan CSV export.
function ViewLaporan({
  selectedShiftId, setSelectedShiftId,   // authH
  shifts, activeShift,                   // authH
  history,                                // historyH
  menu,                                   // menuH
  doCSV, at,                              // historyH
}) {
  const shiftTrx = selectedShiftId==="all"
    ? history
    : selectedShiftId
      ? history.filter(t=>t.shiftId===selectedShiftId)
      : history.filter(t=>t.shiftId===activeShift?.id);
  const selShift = shifts.find(s=>s.id===selectedShiftId);
  const shiftLabel = selectedShiftId==="all"
    ? "Semua Shift"
    : selShift
      ? `Shift ${selShift.shiftNum} — ${selShift.hari} ${selShift.tgl} ${selShift.bln} ${selShift.thn} · ${selShift.operator}`
      : "Pilih shift di atas";

  const rev=shiftTrx.reduce((s,t)=>s+t.total,0);
  const pjk=shiftTrx.reduce((s,t)=>s+(t.pajak||0),0);
  const srv=shiftTrx.reduce((s,t)=>s+(t.service||0),0);
  const mod=shiftTrx.reduce((s,t)=>{t.items.forEach(i=>{s+=(i.modal||0)*i.qty;});return s;},0);
  const sub=shiftTrx.reduce((s,t)=>s+t.subtotal,0);
  const laba=rev-mod;
  const totalPax=shiftTrx.reduce((s,t)=>s+(t.pax||0),0);
  const rpp=totalPax>0?Math.round(rev/totalPax):0;
  const hasModal=shiftTrx.some(t=>t.items.some(i=>i.modal>0));

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
      <div style={{fontSize:14,fontWeight:700,color:G,marginBottom:3}}>Laporan Keuangan & Penjualan</div>
      <div style={{fontSize:11,color:MT,marginBottom:12}}>CSV diunduh terpisah per hari. Isi harga modal di Kelola Menu untuk laporan laba/rugi.</div>

      {/* ── Selector Shift ── */}
      <div style={{background:W,border:`1px solid ${BD}`,borderRadius:10,padding:"12px 14px",marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:TX,marginBottom:8}}>Pilih Shift</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          <button onClick={()=>setSelectedShiftId("all")} style={{padding:"6px 12px",border:`2px solid ${selectedShiftId==="all"?G:BD}`,borderRadius:7,background:selectedShiftId==="all"?"#e8f5ee":W,color:selectedShiftId==="all"?G:TX,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700}}>
            Semua Shift
          </button>
          {[...shifts].reverse().map(s=>(
            <button key={s.id} onClick={()=>setSelectedShiftId(s.id)}
              style={{padding:"6px 12px",border:`2px solid ${selectedShiftId===s.id?G:BD}`,borderRadius:7,background:selectedShiftId===s.id?"#e8f5ee":W,color:selectedShiftId===s.id?G:TX,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:700,textAlign:"left"}}>
              <span style={{display:"block"}}>Shift {s.shiftNum} · {s.tgl} {s.bln} {s.thn}</span>
              <span style={{fontSize:9,color:MT,fontWeight:400}}>{s.startJam}{s.endJam?`–${s.endJam}`:""} · {s.operator} {s.status==="open"?"🟢 Aktif":""}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{fontSize:11,fontWeight:700,color:G,marginBottom:10}}>📊 {shiftLabel} — {shiftTrx.length} transaksi</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10,marginBottom:20}}>
        {[
          {l:"Total Pendapatan",v:fmt(rev),c:G,s:`dari ${shiftTrx.length} trx`},
          {l:"Pajak (10%)",v:fmt(pjk),c:"#2a5a8a",s:"terkumpul"},
          {l:"Service (6%)",v:fmt(srv),c:"#5a2a8a",s:"terkumpul"},
          {l:"Total Pax",v:fmtNum(totalPax),c:"#2a5a8a",s:`${rpp?fmt(rpp)+"/pax":"-"}`},
          {l:"Total Modal",v:hasModal?fmt(mod):"Belum diinput",c:"#b87a00",s:hasModal?`dari sub ${fmt(sub)}`:"-"},
          {l:"Estimasi Laba",v:hasModal?fmt(laba):"Belum diinput",c:laba>=0?G:"#e84040",s:hasModal?`margin ${sub>0?((laba/sub)*100).toFixed(1):0}%`:"-"},
        ].map((s,i)=>(
          <div key={i} style={{background:W,border:`1px solid ${BD}`,borderRadius:9,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:10,color:MT,marginBottom:4}}>{s.l}</div>
            <div style={{fontSize:15,fontWeight:700,color:s.c}}>{s.v}</div>
            <div style={{fontSize:9,color:MT,marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Breakdown per metode */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:TX,marginBottom:8}}>Pendapatan per Metode Bayar</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))",gap:8}}>
          {["cash","debit-bca","debit-bni","qris-bca","qris-bni"].map(m=>{
            const normalize = x => x==="transfer-bca"?"debit-bca":x==="qris"?"qris-bca":x;
            const mTrxs = shiftTrx.filter(t=>normalize(t.metodeBayar)===m);
            const mTotal = mTrxs.reduce((s,t)=>s+t.total,0);
            const mc = METODE_COLORS[m]||{bg:LT,tc:MT};
            return(
              <div key={m} style={{background:mc.bg,border:`1px solid ${BD}`,borderRadius:9,padding:"11px 13px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,fontWeight:700,color:mc.tc,marginBottom:4}}>{METODE_LABELS[m]}</div>
                <div style={{fontSize:14,fontWeight:700,color:TX}}>{fmt(mTotal)}</div>
                <div style={{fontSize:9,color:MT,marginTop:2}}>{mTrxs.length} transaksi</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSV cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {[
          {title:"Laporan Keuangan (Untung/Rugi)",desc:"Ringkasan per hari: pendapatan, pajak, service, modal, laba/rugi, dan avg per pax.",btn:"Unduh CSV Laporan Keuangan",fn:()=>doCSV(`Laporan_Keuangan_${selectedShiftId==="all"?"Semua":`Shift${selShift?.shiftNum||""}` }`,csvLaporan(shiftTrx,at()))},
          {title:"Sales Rate",desc:"Top 10 terlaku, top 10 paling sedikit, dan semua menu yang belum terjual sama sekali.",btn:"Unduh CSV Sales Rate",fn:()=>doCSV(`Sales_Rate_${selectedShiftId==="all"?"Semua":`Shift${selShift?.shiftNum||""}`}`,csvSalesRate(shiftTrx,menu,at()))},
          {title:"Rangkuman Per Menu",desc:"Total qty, pendapatan, modal, laba, dan margin % untuk setiap item menu.",btn:"Unduh CSV Per Menu",fn:()=>doCSV(`Rangkuman_Per_Menu_${selectedShiftId==="all"?"Semua":`Shift${selShift?.shiftNum||""}`}`,csvPerMenu(shiftTrx,menu,at()))},
          {title:"Semua Transaksi Detail",desc:"Detail setiap transaksi, terpisah per hari dalam file CSV. Termasuk pax dan metode bayar.",btn:"Unduh CSV Transaksi",fn:()=>doCSV(`Transaksi_${selectedShiftId==="all"?"Semua":`Shift${selShift?.shiftNum||""}`}`,csvByDay(shiftTrx,TRX_HEADER,trxRow,at()))},
          {title:"Laporan Per Metode Bayar",desc:"Rincian jumlah transaksi dan total pendapatan per metode: Tunai, Debit BCA/BNI, QRIS BCA/BNI — per hari dan total.",btn:"Unduh CSV Metode Bayar",fn:()=>doCSV(`Metode_Bayar_${selectedShiftId==="all"?"Semua":`Shift${selShift?.shiftNum||""}`}`,csvMetodeBayar(shiftTrx,at()))},
        ].map((c,i)=>(
          <div key={i} style={{background:W,border:`1px solid ${BD}`,borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:5}}>{c.title}</div>
            <div style={{fontSize:11,color:MT,marginBottom:12,lineHeight:1.6}}>{c.desc}</div>
            <button onClick={c.fn} disabled={!shiftTrx.length} style={{width:"100%",padding:"9px 0",background:shiftTrx.length?G:LT,color:shiftTrx.length?W:MT,border:"none",borderRadius:7,cursor:shiftTrx.length?"pointer":"not-allowed",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
              {c.btn}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ViewLaporan);
