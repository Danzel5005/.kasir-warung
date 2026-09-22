import { useEffect, useMemo, useState } from "react";
import { G, W, BD, LT, MT, TX, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { api } from "../../utilities/utils.js";

// StockInModal — catat stok masuk (restock) untuk satu item.
// Dibuka dari StockAlertPanel (tombol "Stok Masuk") atau dari baris item.
// Harga modal default = harga beli terakhir (item.modal) bila tidak diubah.
export default function StockInModal({ item, onClose, onDone, toast_ }) {
  const [qty, setQty] = useState("");
  const [modal, setModal] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQty("");
    setModal(item.modal ? String(item.modal) : "");
    setNote("");
    setBusy(false);
  }, [item]);

  const addQty = useMemo(() => parseInt(qty, 10) || 0, [qty]);
  const stok = item?.stok;
  const unlimited = stok === null || stok === undefined;
  const after = unlimited ? null : Math.max(0, Number(stok) + addQty);

  if (!item) return null;

  const submit = async () => {
    if (addQty <= 0) { toast_?.("Jumlah harus lebih dari 0", "err"); return; }
    if (unlimited) { toast_?.("Item ini stoknya tak terbatas", "err"); return; }
    setBusy(true);
    try {
      const res = await api.stockIn({ id: item.id, qty: addQty, modalBaru: modal, note: note.trim() });
      if (res?.ok) {
        toast_?.(`Stok "${item.nama}" +${addQty}`, "ok");
        onDone?.(res);
        onClose?.();
      } else {
        toast_?.(res?.error || "Gagal menambah stok", "err");
      }
    } catch {
      toast_?.("Gagal menambah stok", "err");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={onClose}>
      <div style={{ background:W, borderRadius:RADIUS.lg || RADIUS.md, width:"min(420px, 92vw)", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, ...row }}>
          <div style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Stok Masuk</div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:MT, fontSize:16 }}>&#10005;</button>
        </div>

        <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ background:LT, borderRadius:RADIUS.sm, padding:"8px 10px" }}>
            <div style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700, color:TX }}>{item.nama}</div>
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>
              Stok sekarang: {unlimited ? "Tak terbatas" : Number(stok)}
              {!unlimited && addQty > 0 && ` → ${after}`}
            </div>
          </div>

          <label style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>Jumlah masuk</span>
            <input id="stockin-qty" name="stockInQty" autoFocus value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
              placeholder="0" inputMode="numeric"
              style={{ border:`1px solid ${BD}`, borderRadius:RADIUS.sm, padding:"7px 9px", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, outline:"none" }} />
          </label>

          <label style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>Harga modal terbaru / satuan (opsional)</span>
            <input id="stockin-modal" name="stockInModal" value={modal} onChange={(e) => setModal(e.target.value.replace(/\D/g, ""))}
              placeholder="mis. 5000" inputMode="numeric"
              style={{ border:`1px solid ${BD}`, borderRadius:RADIUS.sm, padding:"7px 9px", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, outline:"none" }} />
            <span style={{ fontSize:9, color:MT }}>Dikosongkan = modal lama dipertahankan.</span>
          </label>

          <label style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>Catatan (opsional)</span>
            <input id="stockin-note" name="stockInNote" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="mis. beli dari supplier A"
              style={{ border:`1px solid ${BD}`, borderRadius:RADIUS.sm, padding:"7px 9px", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, outline:"none" }} />
          </label>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <button onClick={onClose} disabled={busy}
              style={{ background:"#f2f2f2", color:"#555", border:"none", borderRadius:RADIUS.md, padding:"7px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}>
              Batal
            </button>
            <button onClick={submit} disabled={busy || addQty <= 0}
              style={{ background: addQty > 0 ? G : "#c8d6cf", color:W, border:"none", borderRadius:RADIUS.md, padding:"7px 14px", cursor: addQty > 0 ? "pointer" : "default", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}>
              {busy ? "Menyimpan..." : `Tambah${addQty > 0 ? ` +${addQty}` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
