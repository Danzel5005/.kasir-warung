import { G, W, LT, BD } from "../../constants/colors.js";
import { row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function CatModal({ menuH }) {
  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) menuH.setCatModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"20px", width:380, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ ...row, marginBottom:14 }}>
          <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Kelola Kategori</span>
          <button
            onClick={() => menuH.setCatModal(false)}
            style={{ background:"none", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, width:24, height:24, cursor:"pointer", fontSize:TYPOGRAPHY.small.fontSize }}
          >&#10005;</button>
        </div>

        {/* List kategori */}
        <div style={{ marginBottom:12 }}>
          {menuH.cats.map(c => (
            <div key={c.key} style={{ ...row, padding:"8px 10px", background:LT, borderRadius:RADIUS.md, marginBottom:5 }}>
              <span style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}>{c.label}</span>
              <button
                onClick={() => menuH.deleteCat(c.key)}
                style={{ background:COLOR_PALETTE.dangerLight, color:COLOR_PALETTE.danger, border:"none", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
              >Hapus</button>
            </div>
          ))}
        </div>

        {/* Tambah kategori baru */}
        <div style={{ display:"flex", gap:7 }}>
          <input
            value={menuH.newCatLabel}
            onChange={e => menuH.setNewCatLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && menuH.addCat()}
            placeholder="Nama kategori baru..."
            style={{ ...inp, flex:1 }}
          />
          <button
            onClick={menuH.addCat}
            style={{ padding:"8px 14px", background:G, color:W, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
          >+ Tambah</button>
        </div>
      </div>
    </div>
  );
}
