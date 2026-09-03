import { useState } from "react";
import { G, W, LT, BD } from "../../constants/colors.js";
import { row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

export default function CatModal({ menuH }) {
  const [tagModalCat, setTagModalCat] = useState(null);
  const [editingCatKey, setEditingCatKey] = useState(null);
  const [editingCatLabel, setEditingCatLabel] = useState("");

  const beginEditCat = (cat) => {
    setEditingCatKey(cat.key);
    setEditingCatLabel(cat.label);
  };

  const saveEditCat = async () => {
    if (!editingCatKey) return;
    const ok = await menuH.editCat(editingCatKey, editingCatLabel);
    if (ok) {
      setEditingCatKey(null);
      setEditingCatLabel("");
    }
  };

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
            <div key={c.key} style={{ ...row, padding:"8px 10px", background:LT, borderRadius:RADIUS.md, marginBottom:5, gap:6 }}>
              {editingCatKey === c.key ? (
                <>
                  <input
                    autoFocus
                    value={editingCatLabel}
                    onChange={e => setEditingCatLabel(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        await saveEditCat();
                      }
                      if (e.key === "Escape") {
                        setEditingCatKey(null);
                        setEditingCatLabel("");
                      }
                    }}
                    placeholder="Nama kategori"
                    style={{ ...inp, flex:1, minWidth:0 }}
                  />
                  <button
                    onClick={saveEditCat}
                    style={{ background:G, color:W, border:"none", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
                  >Simpan</button>
                  <button
                    onClick={() => {
                      setEditingCatKey(null);
                      setEditingCatLabel("");
                    }}
                    style={{ background:"#f5f5f5", color: "#666", border:"1px solid #ddd", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
                  >Batal</button>
                </>
              ) : (
                <>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}>{c.label}</span>
                    {c.tags && c.tags.length > 0 && (
                      <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                        {c.tags.map(tag => (
                          <div key={tag} style={{ display:"flex", alignItems:"center", gap:2, fontSize:TYPOGRAPHY.label.fontSize, background:COLOR_PALETTE.successLight, color:COLOR_PALETTE.success, padding:"2px 6px", borderRadius:RADIUS.sm }}>
                            <span>{tag === "drinks" ? "🥤 Drinks" : tag}</span>
                            <button
                              onClick={() => menuH.removeTagFromCategory(c.key, tag)}
                              style={{ background:"none", border:"none", color:COLOR_PALETTE.success, cursor:"pointer", padding:0, fontSize:"12px", fontWeight:"bold", lineHeight:1 }}
                              title="Hapus tag"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => beginEditCat(c)}
                    style={{ background:COLOR_PALETTE.infoLight, color:COLOR_PALETTE.info, border:"none", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600, whiteSpace:"nowrap" }}
                  >Edit</button>
                  <button
                    onClick={() => setTagModalCat(c.key)}
                    style={{ background:COLOR_PALETTE.infoLight, color:COLOR_PALETTE.info, border:"none", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600, whiteSpace:"nowrap" }}
                  >Add tag</button>
                  <button
                    onClick={() => menuH.deleteCat(c.key)}
                    style={{ background:COLOR_PALETTE.dangerLight, color:COLOR_PALETTE.danger, border:"none", borderRadius:RADIUS.sm, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
                  >Hapus</button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Tag Modal */}
        {tagModalCat && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400 }}
            onClick={e => { if (e.target === e.currentTarget) setTagModalCat(null); }}
          >
            <div style={{ background:W, borderRadius:RADIUS.lg, padding:"20px", width:320, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ ...row, marginBottom:14 }}>
                <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>Tambah Tag</span>
                <button
                  onClick={() => setTagModalCat(null)}
                  style={{ background:"none", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, width:24, height:24, cursor:"pointer", fontSize:TYPOGRAPHY.small.fontSize }}
                >&#10005;</button>
              </div>
              
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button
                  onClick={() => {
                    menuH.addTagToCategory(tagModalCat, "drinks");
                    setTagModalCat(null);
                  }}
                  style={{ padding:"10px 12px", background:COLOR_PALETTE.successLight, color:COLOR_PALETTE.success, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600, textAlign:"left" }}
                >
                  Drinks (Cupsize, Sugar, Ice/Hot)
                </button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <button
                  onClick={() => {
                    menuH.addTagToCategory(tagModalCat, "Rokok");
                    setTagModalCat(null);
                  }}
                  style={{ padding:"10px 12px", background:COLOR_PALETTE.successLight, color:COLOR_PALETTE.success, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600, textAlign:"left" }}
                >
                  Rokok
                </button>
              </div>

            </div>
          </div>
        )}

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
