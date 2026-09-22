import { useEffect, useMemo, useState } from "react";
import { G, W, BD, LT, MT, TX, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { api } from "../../utilities/utils.js";

// OpnameModal — hitung stok fisik. Daftar item berstok (bukan tak terbatas)
// dengan input hasil hitung; selisih dihitung otomatis dan disimpan sebagai
// mutasi `opname`. Dipisah dari ViewKelola supaya view itu tidak membengkak.
export default function OpnameModal({ menu, onClose, onDone, toast_ }) {
  const tracked = useMemo(() => (menu || []).filter((m) => m.stok !== null && m.stok !== undefined), [menu]);
  const [counted, setCounted] = useState({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCounted({}); setSearch(""); setBusy(false); }, [menu]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracked.filter((m) => !q || `${m.nama || ""} ${m.menuId || ""}`.toLowerCase().includes(q));
  }, [tracked, search]);

  const diffs = useMemo(() => {
    const out = {};
    rows.forEach((m) => {
      const raw = counted[m.id];
      if (raw === undefined || raw === "") return;
      const c = parseInt(raw, 10);
      if (Number.isNaN(c)) return;
      out[m.id] = c - Number(m.stok);
    });
    return out;
  }, [rows, counted]);

  const changed = Object.entries(diffs).filter(([, d]) => d !== 0);

  const submit = async () => {
    const payload = changed.map(([id]) => ({ id, counted: parseInt(counted[id], 10) }));
    if (!payload.length) { toast_?.("Tidak ada selisih untuk disimpan", "err"); return; }
    setBusy(true);
    try {
      const res = await api.stockOpname(payload, { note: "opname" });
      if (res?.ok) {
        toast_?.(`Opname disimpan (${payload.length} item)`, "ok");
        onDone?.(res);
        onClose?.();
      } else {
        toast_?.(res?.error || "Gagal menyimpan opname", "err");
      }
    } catch {
      toast_?.("Gagal menyimpan opname", "err");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
      onClick={onClose}>
      <div style={{ background:W, borderRadius:RADIUS.lg, width:"min(560px, 94vw)", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${BD}`, ...row }}>
          <div>
            <div style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Stok Opname</div>
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT }}>{tracked.length} item berstok · {changed.length} selisih</div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:MT, fontSize:16 }}>&#10005;</button>
        </div>

        <div style={{ padding:"9px 16px", borderBottom:`1px solid ${BD}` }}>
          <input id="opname-search" name="opnameSearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari item..."
            style={{ width:"100%", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, padding:"7px 9px", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"8px 16px" }}>
          {rows.length === 0 && <div style={{ padding:"12px 0", fontSize:TYPOGRAPHY.small.fontSize, color:MT }}>Tidak ada item berstok.</div>}
          {rows.map((m) => {
            const d = diffs[m.id];
            const hasDiff = d !== undefined && d !== 0;
            return (
              <div key={m.id} style={{ ...row, padding:"6px 0", borderBottom:`1px solid ${LT}` }}>
                <div style={{ minWidth:0, paddingRight:8 }}>
                  <div style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600, color:TX, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.nama}</div>
                  <div style={{ fontSize:9, color:MT }}>Sistem: {Number(m.stok)}{hasDiff ? ` · selisih ${d > 0 ? "+" : ""}${d}` : ""}</div>
                </div>
                <input id={`opname-count-${m.id}`} name={`opnameCount_${m.id}`} value={counted[m.id] ?? ""} onChange={(e) => setCounted((p) => ({ ...p, [m.id]: e.target.value.replace(/\D/g, "") }))}
                  placeholder={String(Number(m.stok))} inputMode="numeric"
                  style={{ width:76, border:`1px solid ${hasDiff ? "#e8a040" : BD}`, borderRadius:RADIUS.sm, padding:"5px 8px", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, outline:"none", textAlign:"right",
                    background: hasDiff ? "#fffaf0" : W }} />
              </div>
            );
          })}
        </div>

        <div style={{ padding:"12px 16px", borderTop:`1px solid ${BD}`, display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} disabled={busy}
            style={{ background:"#f2f2f2", color:"#555", border:"none", borderRadius:RADIUS.md, padding:"7px 14px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}>
            Batal
          </button>
          <button onClick={submit} disabled={busy || changed.length === 0}
            style={{ background: changed.length ? G : "#c8d6cf", color:W, border:"none", borderRadius:RADIUS.md, padding:"7px 14px", cursor: changed.length ? "pointer" : "default", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}>
            {busy ? "Menyimpan..." : `Simpan${changed.length ? ` (${changed.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
