import { fmt } from "../../utilities/receipt.js";
import { G, W, LT, BD, TX, MT, row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";

export default function ItemModal({ menuH, photoRef, fmt: fmtProp }) {
  // Gunakan fmt dari prop kalau ada (backward compat), fallback ke import lokal
  const fmtFn = fmtProp || fmt;

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) menuH.setItemModal(false); }}
    >
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"18px", width:400, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ ...row, marginBottom:12 }}>
          <span style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, color:G }}>
            {menuH.editTarget ? "Edit Menu" : "Tambah Menu Baru"}
          </span>
          <button
            onClick={() => menuH.setItemModal(false)}
            style={{ background:"none", border:`1px solid ${BD}`, borderRadius:RADIUS.sm, width:24, height:24, cursor:"pointer", fontSize:TYPOGRAPHY.small.fontSize }}
          >&#10005;</button>
        </div>

        {/* Field teks */}
        {[
          { l:"Menu ID",            k:"menuId", p:"Contoh: M-1001" },
          { l:"Nama Menu *",        k:"nama",   p:"Contoh: Kopi Susu Gula Aren" },
          { l:"Harga Jual (Rp) *",  k:"harga",  p:"Contoh: 50000" },
          { l:"Harga Modal (Rp)",   k:"modal",  p:"Untuk laporan laba/rugi" },
          { l:"Deskripsi",          k:"desc",   p:"Contoh: Bestseller" },
        ].map(f => (
          <div key={f.k} style={{ marginBottom:8 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:3 }}>{f.l}</label>
            <input
              type="text"
              placeholder={f.p}
              value={menuH.form[f.k]}
              onChange={e => {
                let v = e.target.value;
                if (f.k === "harga" || f.k === "modal") v = v.replace(/\D/g, "");
                menuH.setForm(x => ({ ...x, [f.k]:v }));
              }}
              style={inp}
            />
          </div>
        ))}

        {/* Stok */}
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:3 }}>
            Stok (kosong = tidak terbatas)
          </label>
          <input
            type="number"
            min="0"
            placeholder="Kosongkan jika tidak ada batas"
            value={menuH.form.stok}
            onChange={e => menuH.setForm(f => ({ ...f, stok:e.target.value }))}
            style={inp}
          />
        </div>

        {/* Kategori */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:600, display:"block", marginBottom:5 }}>KATEGORI</label>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {menuH.cats.map(k => (
              <button
                key={k.key}
                onClick={() => menuH.setForm(f => ({ ...f, kategori:k.key }))}
                style={{ padding:"4px 9px", borderRadius:RADIUS.sm, border:`1px solid ${menuH.form.kategori===k.key ? G : BD}`, background:menuH.form.kategori===k.key ? COLOR_PALETTE.primaryLight : W, color:menuH.form.kategori===k.key ? G : TX, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.label.fontSize, fontWeight:600 }}
              >{k.label}</button>
            ))}
          </div>
        </div>

        {/* Estimasi laba */}
        {menuH.form.harga && (
          <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:G, marginBottom:10, textAlign:"right", fontWeight:600 }}>
            Jual: {fmtFn(parseInt(menuH.form.harga) || 0)} · Modal: {fmtFn(parseInt(menuH.form.modal) || 0)} · Est. laba/item: {fmtFn((parseInt(menuH.form.harga) || 0) - (parseInt(menuH.form.modal) || 0))}
          </div>
        )}

        <button
          onClick={menuH.saveItem}
          style={{ width:"100%", padding:10, background:G, color:W, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
        >{menuH.editTarget ? "Simpan Perubahan" : "Tambahkan ke Menu"}</button>
      </div>
    </div>
  );
}
