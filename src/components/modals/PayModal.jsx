import { fmt } from "../../utilities/receipt.js";
import { G, OR, W, LT, BD, TX, MT } from "../../constants/colors.js";
import { row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function PayModal({ cartH, processPayment, setPayModal, paymentMethods = [], receiptAdditionals = [] }) {
  // Group payment methods by category
  const groupedMethods = (paymentMethods || []).reduce((acc, method) => {
    const cat = method.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(method);
    return acc;
  }, {});

  // Category labels and colors
  const categoryConfig = {
    cash: { label: "💵 TUNAI", color: COLOR_PALETTE.secondary, colorLight: COLOR_PALETTE.secondaryLight },
    debit: { label: "🏦 DEBIT", color: COLOR_PALETTE.info, colorLight: COLOR_PALETTE.infoLight },
    qris: { label: "📱 QRIS", color: G, colorLight: COLOR_PALETTE.primaryLight },
    custom: { label: "🏪 LAINNYA", color: COLOR_PALETTE.warning, colorLight: "#fff3e0" },
  };

  const getCategoryColor = (category) => {
    return categoryConfig[category]?.color || TX;
  };

  const getCategoryColorLight = (category) => {
    return categoryConfig[category]?.colorLight || LT;
  };

  const getButtonColor = (isSelected, category) => {
    if (isSelected) return categoryConfig[category]?.color || TX;
    return TX;
  };

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) setPayModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, width:400, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column", maxHeight:"80vh", padding:0 }}>

        {/* Header */}
        <div style={{ padding:"20px", flex:"0 0 auto" }}>
          <div style={{ ...row, marginBottom: 0 }}>
            <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Pembayaran</span>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>
              {receiptAdditionals && receiptAdditionals.length > 0 ? (
                <>
                  {receiptAdditionals
                    .filter(f => f.category === "receipt" && f.visible !== false)
                    .map((field, idx) => (
                      <span key={field.key} style={{ marginRight: idx > 0 ? " · " : "" }}>
                        {field.label}: {cartH.receiptAdditionalValues?.[field.key] || cartH[field.key] || "-"}
                      </span>
                    ))}
                </>
              ) : (
                <>
                  Meja {cartH.tableNum}{cartH.pax ? ` · ${cartH.pax} pax` : ""}
                </>
              )}
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

          {/* Metode pembayaran — Dynamic dari settings */}
          <div style={{ marginBottom:11 }}>
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, marginBottom:6 }}>METODE PEMBAYARAN</div>

            {/* Render grouped payment methods */}
            {Object.entries(groupedMethods).map(([category, methods]) => (
              <div key={category} style={{ marginBottom: 10 }}>
                <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:getCategoryColor(category), fontWeight:600, marginBottom:4 }}>
                  {categoryConfig[category]?.label || category.toUpperCase()}
                </div>
                <div style={{
                  display:"grid",
                  gridTemplateColumns: category === "cash" ? "1fr" : "1fr 1fr",
                  gap:7,
                  marginBottom:7
                }}>
                  {methods.map(m => (
                    <button
                      key={m.key}
                      onClick={() => cartH.setMetode(m.key)}
                      style={{
                        padding:"8px 5px",
                        border:`2px solid ${cartH.metode===m.key ? getCategoryColor(category) : BD}`,
                        borderRadius:RADIUS.md,
                        background:cartH.metode===m.key ? getCategoryColorLight(category) : W,
                        cursor:"pointer",
                        fontFamily:"inherit",
                        textAlign:"center"
                      }}
                    >
                      <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:getButtonColor(cartH.metode===m.key, category) }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize:TYPOGRAPHY.label.fontSize - 2, color:MT, marginTop:1 }}>
                        {category === "cash" ? "Uang cash" : category === "qris" ? "Scan QR" : category === "debit" ? "Kartu debit" : "Metode lain"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
              background: getCategoryColorLight(
                paymentMethods.find(m => m.key === cartH.metode)?.category || "custom"
              ),
              border: `1px solid ${getCategoryColor(paymentMethods.find(m => m.key === cartH.metode)?.category || "custom")}`,
              borderRadius:RADIUS.md, padding:"8px", marginBottom:8, textAlign:"center", fontSize:TYPOGRAPHY.label.fontSize,
              color: getCategoryColor(paymentMethods.find(m => m.key === cartH.metode)?.category || "custom"), fontWeight:600,
            }}>
              {(() => {
                const cat = paymentMethods.find(m => m.key === cartH.metode)?.category;
                if (cat === "cash") return "Pembayaran dengan uang cash";
                if (cat === "debit") return "Pembayaran dengan kartu debit";
                if (cat === "qris") return "Scan QRIS untuk pembayaran";
                return "Lanjutkan dengan metode pembayaran ini";
              })()}
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
