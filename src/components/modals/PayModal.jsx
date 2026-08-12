import { fmt } from "../../utilities/receipt.js";
import { G, OR, W, LT, BD, TX, MT } from "../../constants/colors.js";
import { row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function PayModal({ cartH, processPayment, setPayModal }) {
  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) setPayModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, width:400, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column", maxHeight:"80vh", padding:0 }}>

        {/* Header */}
        <div style={{ padding:"20px", flex:"0 0 auto" }}>
          <div style={{ ...row, marginBottom:0 }}>
            <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Pembayaran</span>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>
              Meja {cartH.tableNum}{cartH.pax ? ` · ${cartH.pax} pax` : ""}
              {cartH.activeBill ? ` · Bill #${cartH.activeBill.id}` : ""}
            </span>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding:"0 20px 20px 20px", overflowY:"auto", flex:"1 1 auto" }}>

          {/* Ringkasan order */}
          <div style={{ background:LT, borderRadius:RADIUS.md, padding:"9px 11px", marginBottom:11 }}>
            {cartH.items.map((item, i) => (
              <div key={i} style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, marginBottom:2 }}>
                <span>{item.qty}x {item.nama}</span>
                <span>{fmt(item.harga * item.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${BD}`, marginTop:7, paddingTop:7 }}>
              <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT }}><span>Subtotal</span><span>{fmt(cartH.subtotal)}</span></div>
              <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT }}><span>Service 6%</span><span>{fmt(cartH.service)}</span></div>
              <div style={{ ...row, fontSize:TYPOGRAPHY.label.fontSize, color:MT }}><span>Pajak 10%</span><span>{fmt(cartH.pajak)}</span></div>
              <div style={{ ...row, fontSize:15, fontWeight:700, marginTop:5 }}>
                <span>Total</span><span style={{ color:OR }}>{fmt(cartH.total)}</span>
              </div>
            </div>
          </div>

          {/* Metode pembayaran */}
          <div style={{ marginBottom:11 }}>
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, marginBottom:6 }}>METODE PEMBAYARAN</div>

            {/* Tunai */}
            <button
              onClick={() => cartH.setMetode("cash")}
              style={{ width:"100%", padding:"8px 5px", border:`2px solid ${cartH.metode==="cash" ? G : BD}`, borderRadius:RADIUS.md, background:cartH.metode==="cash" ? COLOR_PALETTE.secondaryLight : W, cursor:"pointer", fontFamily:"inherit", textAlign:"center", marginBottom:7 }}
            >
              <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:cartH.metode==="cash" ? "#b87a00" : TX }}>Tunai</div>
              <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, marginTop:1 }}>Uang cash</div>
            </button>

            {/* Debit */}
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, fontWeight:600, marginBottom:4 }}>DEBIT</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:7 }}>
              {[
                { key:"debit-bca", label:"Debit BCA", sub:"Kartu debit BCA" },
                { key:"debit-bni", label:"Debit BNI", sub:"Kartu debit BNI" },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => cartH.setMetode(m.key)}
                  style={{ padding:"8px 5px", border:`2px solid ${cartH.metode===m.key ? COLOR_PALETTE.info : BD}`, borderRadius:RADIUS.md, background:cartH.metode===m.key ? COLOR_PALETTE.infoLight : W, cursor:"pointer", fontFamily:"inherit", textAlign:"center" }}
                >
                  <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:cartH.metode===m.key ? COLOR_PALETTE.info : TX }}>{m.label}</div>
                  <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, marginTop:1 }}>{m.sub}</div>
                </button>
              ))}
            </div>

            {/* QRIS */}
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, fontWeight:600, marginBottom:4 }}>QRIS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
              {[
                { key:"qris-bca", label:"QRIS BCA", sub:"Scan QR BCA" },
                { key:"qris-bni", label:"QRIS BNI", sub:"Scan QR BNI" },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => cartH.setMetode(m.key)}
                  style={{ padding:"8px 5px", border:`2px solid ${cartH.metode===m.key ? G : BD}`, borderRadius:RADIUS.md, background:cartH.metode===m.key ? COLOR_PALETTE.primaryLight : W, cursor:"pointer", fontFamily:"inherit", textAlign:"center" }}
                >
                  <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:cartH.metode===m.key ? G : TX }}>{m.label}</div>
                  <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, marginTop:1 }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input uang (cash) */}
          {cartH.metode === "cash" && (<>
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, marginBottom:4 }}>JUMLAH BAYAR (Rp)</div>
            <input
              type="text"
              value={cartH.paid}
              onChange={e => cartH.setPaid(e.target.value.replace(/\D/g, ""))}
              placeholder="Masukkan jumlah uang..."
              autoFocus
              style={{ ...inp, fontSize:TYPOGRAPHY.body.fontSize, marginBottom:8, border:`2px solid ${cartH.paidNum >= cartH.total ? "#a8d5b8" : BD}` }}
            />
            {cartH.paidNum >= cartH.total && (
              <div style={{ background:COLOR_PALETTE.primaryLight, border:"1px solid #a8d5b8", borderRadius:RADIUS.md, padding:"7px 10px", marginBottom:8, ...row, fontSize:TYPOGRAPHY.small.fontSize, color:G }}>
                <span>Kembalian</span>
                <span style={{ fontWeight:700 }}>{fmt(cartH.kembalian)}</span>
              </div>
            )}
          </>)}

          {/* Info non-cash */}
          {cartH.metode !== "cash" && (
            <div style={{
              background: cartH.metode.startsWith("debit") ? COLOR_PALETTE.infoLight : COLOR_PALETTE.primaryLight,
              border: `1px solid ${cartH.metode.startsWith("debit") ? "#b8ccf0" : "#a8d5b8"}`,
              borderRadius:RADIUS.md, padding:"8px", marginBottom:8, textAlign:"center", fontSize:TYPOGRAPHY.label.fontSize,
              color: cartH.metode.startsWith("debit") ? COLOR_PALETTE.info : G, fontWeight:600,
            }}>
              {cartH.metode.startsWith("debit") ? "Pembayaran dengan kartu debit" : "Scan QRIS untuk pembayaran"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 20px", borderTop:`1px solid ${BD}`, flex:"0 0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button
              onClick={() => setPayModal(false)}
              style={{ padding:10, border:`1px solid ${BD}`, borderRadius:RADIUS.md, background:W, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}
            >Batal</button>
            <button
              onClick={processPayment}
              disabled={!cartH.canPay}
              style={{ padding:10, border:"none", borderRadius:RADIUS.md, background:cartH.canPay ? OR : "#f0c89a", color:W, cursor:cartH.canPay ? "pointer" : "not-allowed", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
            >Konfirmasi Bayar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
