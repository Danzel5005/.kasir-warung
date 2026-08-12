import { useEffect, useState } from "react";
import { calcPrice } from "../../utilities/calculations.js";
import { fmt } from "../../utilities/receipt.js";
import { METODE_LABELS} from "../../constants/payments.js";
import { METODE_COLORS,G, OR, W, BD, MT } from "../../constants/colors.js";
import { row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function ReceiptModal({ receipt, logo, printReceipt, setReceipt }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPrinting) return undefined;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(90, Math.round(prev + 12 + Math.random() * 10));
      });
    }, 180);
    return () => window.clearInterval(interval);
  }, [isPrinting]);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setProgress(10);
    try {
      await printReceipt(receipt);
      setProgress(100);
    } finally {
      window.setTimeout(() => {
        setIsPrinting(false);
        setProgress(0);
      }, 450);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:W, width:295, borderRadius:RADIUS.lg, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column", maxHeight:"80vh", padding:0, fontFamily:"'Courier New',monospace", position:"relative" }}>
        {isPrinting && (
          <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.93)", zIndex:5, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div style={{ width:"100%", maxWidth:240 }}>
              <div style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700, color:G, marginBottom:10, textAlign:"center" }}>
                {progress >= 100 ? "Resi selesai" : "Mencetak resi..."}
              </div>
              <div style={{ height:8, width:"100%", background:"#e9ecef", borderRadius:RADIUS.full, overflow:"hidden", marginBottom:8 }}>
                <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg, ${G} 0%, ${OR} 100%)`, transition:"width 0.2s ease" }} />
              </div>
              <div style={{ display:"grid", gap:6 }}>
                {[1,2,3,4].map((s) => (
                  <div key={s} style={{ height:8, borderRadius:RADIUS.full, background:"#f1f3f5", overflow:"hidden" }}>
                    <div style={{ width:`${65 + s * 7}%`, height:"100%", background:"#e5e7eb" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding:"20px 17px", flex:"0 0 auto", textAlign:"center" }}>
          {logo
            ? <img src={logo} alt="logo" style={{ width:42, height:42, objectFit:"cover", borderRadius:RADIUS.md, marginBottom:5 }}/>
            : <div style={{ width:42, height:42, background:G, borderRadius:RADIUS.md, display:"flex", alignItems:"center", justifyContent:"center", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700, color:W, margin:"0 auto 5px" }}>YKK</div>
          }
          <div style={{ fontWeight:700, fontSize:TYPOGRAPHY.body.fontSize, color:G }}>restaurant</div>
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>{receipt.hari}, {receipt.tgl} {receipt.bln} {receipt.thn}</div>
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:COLOR_PALETTE.info, fontWeight:700, marginTop:2 }}>
            Meja {receipt.meja}{receipt.pax > 0 ? ` · ${receipt.pax} pax` : ""} · TRX #{receipt.id}
          </div>
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:(METODE_COLORS[receipt.metodeBayar] || { tc:MT }).tc }}>
            {METODE_LABELS[receipt.metodeBayar] || receipt.metodeBayar}
          </div>
          <div style={{ borderTop:"1px dashed #ccc", margin:"7px 0" }}/>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding:"0 17px 17px", overflowY:"auto", flex:"1 1 auto" }}>
          {receipt.items.map((item, i) => (
            <div key={i} style={{ ...row, fontSize:TYPOGRAPHY.small.fontSize, marginBottom:2 }}>
              <span>{item.qty}x {item.nama}</span>
              <span>{fmt(item.harga * item.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop:"1px dashed #ccc", margin:"7px 0" }}/>
          <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT }}><span>Subtotal</span><span>{fmt(receipt.subtotal)}</span></div>
          <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT, marginBottom:2 }}>
            <span>Service 6%</span>
            <span>{fmt(receipt.service ?? calcPrice(receipt.subtotal).service)}</span>
          </div>
          <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>
            <span>Pajak 10%</span>
            <span>{fmt(receipt.pajak ?? calcPrice(receipt.subtotal).pajak)}</span>
          </div>
          <div style={{ ...row, fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, marginTop:3 }}>
            <span>TOTAL</span><span style={{ color:OR }}>{fmt(receipt.total)}</span>
          </div>
          {receipt.metodeBayar === "cash" && (<>
            <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:COLOR_PALETTE.primary }}><span>Bayar</span><span>{fmt(receipt.bayar)}</span></div>
            <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:COLOR_PALETTE.primary }}><span>Kembalian</span><span>{fmt(receipt.kembalian)}</span></div>
          </>)}
          <div style={{ borderTop:"1px dashed #ccc", margin:"7px 0" }}/>
          <div style={{ textAlign:"center", fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>Terima kasih atas kunjungan Anda!</div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 17px", borderTop:`1px solid ${BD}`, flex:"0 0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              style={{ padding:8, border:`1px solid ${G}`, borderRadius:RADIUS.md, background:isPrinting?"#d7e8dd":COLOR_PALETTE.primaryLight, color:G, cursor:isPrinting?"default":"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700, opacity:isPrinting?0.8:1 }}
            >{isPrinting ? "Mencetak..." : "Cetak Resi"}</button>
            <button
              onClick={() => setReceipt(null)}
              style={{ padding:8, background:G, color:W, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
            >Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
