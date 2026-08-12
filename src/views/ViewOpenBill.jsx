import { memo } from "react";
import { calcPrice } from "../utilities/calculations.js";
import { fmt } from "../utilities/receipt.js";
import { G, OR, W, BD, MT } from "../constants/colors.js";
import { row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/theme.js";
import { Tag } from "../components/Tag.jsx";

// ViewOpenBill — daftar tagihan terbuka, aksi tambah pesanan/bayar/hapus.
function ViewOpenBill({
  bills,            // billsH.bills
  loadBillToCart,   // cartH.loadBillToCart
  setView,          // App.jsx local
  loadBillAndPay,   // App.jsx wrapper
  setConfirmDel,    // App.jsx local
}) {
  const openBills = bills.filter(b => b.status === "open");

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"9px 16px",background:W,borderBottom:`1px solid ${BD}`,flexShrink:0,...row}}>
        <div>
          <div style={{fontSize:TYPOGRAPHY.body.fontSize,fontWeight:700,color:G}}>Open Bill — Tagihan Berjalan</div>
          <div style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT}}>{openBills.length} tagihan belum dibayar</div>
        </div>
        {openBills.length>0&&
        <button onClick={()=>setConfirmDel({type:"allBills"})}
          style={{padding:"5px 10px",background:COLOR_PALETTE.dangerLight,color:COLOR_PALETTE.danger,border:"none",borderRadius:RADIUS.sm,cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize,fontWeight:600}}>
            Hapus Semua
        </button>}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
        {openBills.length===0?
        <div style={{textAlign:"center",color:MT,marginTop:80,fontSize:TYPOGRAPHY.body.fontSize}}>
          <div style={{fontSize:40,marginBottom:10}}>&#128203;</div>Tidak ada tagihan terbuka
        </div>
        :openBills.map(bill=>{
          const sub=bill.items.reduce((s,i)=>s+i.harga*i.qty,0);
          const {pajak:p,service:s,total:tot}=calcPrice(sub);
          const dur=Math.round((Date.now()-new Date(bill.createdAt))/60000);
          return(
            <div key={bill.id} style={{background:W,border:"2px solid #f0a040",borderRadius:RADIUS.lg,padding:"11px 14px",marginBottom:9,boxShadow:"0 2px 8px rgba(232,124,42,0.1)"}}>
              <div style={{...row,marginBottom:7}}>
                <div style={{display:"flex",gap:7,alignItems:"center"}}>
                  {<Tag label="BELUM DIBAYAR" bg="#fff4e0" tc="#b87a00"/>}
                  <span style={{fontSize:TYPOGRAPHY.body.fontSize,fontWeight:700}}>Meja {bill.tableNum}</span>
                  <span style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT}}>#{bill.id}</span>
                  {bill.pax>0&&<span style={{fontSize:TYPOGRAPHY.label.fontSize,color:COLOR_PALETTE.info,fontWeight:600}}>{bill.pax} pax</span>}
                </div>
                <span style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT}}>{dur<60?`${dur} mnt lalu`:`${Math.floor(dur/60)} jam lalu`}</span>
              </div>
              <div style={{fontSize:TYPOGRAPHY.label.fontSize,color:MT,marginBottom:7}}>{bill.items.map(i=>`${i.qty}x ${i.nama}`).join(" · ")}</div>
              <div style={{display:"flex",gap:10,fontSize:TYPOGRAPHY.small.fontSize,marginBottom:9,flexWrap:"wrap"}}>
                <span>Sub: <b>{fmt(sub)}</b></span>
                <span style={{color:MT}}>Pajak: {fmt(p)}</span>
                <span style={{color:MT}}>Service: {fmt(s)}</span>
                <span style={{color:OR,fontWeight:700}}>Total: {fmt(tot)}</span>
              </div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>{loadBillToCart(bill); setView("menu");}}
                   style={{flex:1,padding:"6px 0",background:COLOR_PALETTE.primaryLight,color:G,border:"1px solid #a8d5b8",borderRadius:RADIUS.md,cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize,fontWeight:700}}
                >+ Tambah Pesanan
                </button>
                <button onClick={()=>loadBillAndPay(bill)}
                  style={{flex:1,padding:"6px 0",background:OR,color:W,border:"none",borderRadius:RADIUS.md,cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize,fontWeight:700}}>Bayar</button>
                <button onClick={()=>setConfirmDel({type:"bill",id:bill.id})} style={{padding:"6px 9px",background:COLOR_PALETTE.dangerLight,color:COLOR_PALETTE.danger,border:"none",borderRadius:RADIUS.md,cursor:"pointer",fontFamily:"inherit",fontSize:TYPOGRAPHY.label.fontSize}}>Hapus</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ViewOpenBill);
