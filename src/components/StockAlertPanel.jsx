import { memo, useMemo, useState } from "react";
import { G, OR, W, LT, BD, TX, MT, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/design.js";
import { getStockAlerts, buildRestockList, DEFAULT_LOW_STOCK_THRESHOLD } from "../utilities/stock.js";

// StockAlertPanel — low-stock / out-of-stock dashboard with a restock list.
//
// Renders nothing when every tracked item is comfortably stocked, so it can be
// dropped into a view unconditionally without adding noise.
function StockAlertPanel({
  menu = [],
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
  onOpenItem,          // optional: open the item editor for a given item
  onExportCSV,         // optional: (restockRows) => void
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const alerts = useMemo(() => getStockAlerts(menu, threshold), [menu, threshold]);
  const restock = useMemo(() => buildRestockList(menu, threshold), [menu, threshold]);
  const itemById = useMemo(() => {
    const m = new Map();
    (menu || []).forEach((it) => m.set(String(it.id), it));
    return m;
  }, [menu]);

  if (alerts.total === 0) return null;

  const { out, low } = alerts;

  const exportRestock = () => {
    if (onExportCSV) { onExportCSV(restock); return; }
  };

  return (
    <div style={{ background: out.length ? "#fff5f5" : "#fffaf0", border:`1px solid ${out.length ? "#f5c0c0" : "#f0dca8"}`, borderRadius:RADIUS.md, marginBottom:10, overflow:"hidden" }}>
      {/* ── Summary bar (clickable) ── */}
      <div onClick={() => setOpen(o => !o)}
        style={{ ...row, padding:"8px 12px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>{out.length ? "🔴" : "🟠"}</span>
          <span style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700, color: out.length ? COLOR_PALETTE.danger : "#b07000" }}>
            {out.length > 0 && `${out.length} item habis`}
            {out.length > 0 && low.length > 0 && " · "}
            {low.length > 0 && `${low.length} item stok menipis`}
          </span>
          <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>
            (ambang ≤ {threshold})
          </span>
        </div>
        <span style={{ fontSize:11, color:MT }}>{open ? "▾" : "▸"}</span>
      </div>

      {/* ── Detail list ── */}
      {open && (
        <div style={{ borderTop:`1px solid ${out.length ? "#f5c0c0" : "#f0dca8"}`, padding:"8px 12px", background:W }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:G }}>Daftar Restock</span>
            {onExportCSV && (
              <button onClick={exportRestock}
                style={{ padding:"3px 9px", background:"#e8f5ee", color:G, border:"1px solid #b8ddc8", borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontSize:10, fontWeight:600 }}>
                Unduh CSV
              </button>
            )}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {restock.map((r) => (
              <div key={r.id} style={{ ...row, padding:"5px 8px", background:LT, borderRadius:RADIUS.sm }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, background: r.level === "out" ? COLOR_PALETTE.danger : OR }} />
                  <span style={{ fontSize:11, fontWeight:600, color:TX, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.nama}</span>
                  <span style={{ fontSize:9, color:MT, flexShrink:0 }}>{r.kategori}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                  <span style={{ fontSize:10, color: r.level === "out" ? COLOR_PALETTE.danger : "#b07000", fontWeight:700 }}>
                    {r.stok === 0 ? "Habis" : `Sisa ${r.stok}`}
                  </span>
                  <span style={{ fontSize:9, color:MT }}>saran +{r.suggestQty}</span>
                  {onOpenItem && (
                    <button onClick={() => onOpenItem(itemById.get(String(r.id)) || r)}
                      style={{ padding:"2px 7px", background:COLOR_PALETTE.infoLight, color:COLOR_PALETTE.info, border:"none", borderRadius:4, cursor:"pointer", fontFamily:"inherit", fontSize:9, fontWeight:600 }}>
                      Restock
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(StockAlertPanel);
