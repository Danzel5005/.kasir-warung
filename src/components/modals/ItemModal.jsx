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
              id={`item-${f.k}`}
              name={`item_${f.k}`}
              autoComplete="off"
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
            id="item-stok"
            name="item_stok"
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
        {/* Langkah 3: multi-satuan */}
        <div style={{ borderTop:`1px solid ${BD}`, paddingTop:10, marginBottom:8 }}>
          <div style={{ ...row, marginBottom:5 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:700 }}>SATUAN DASAR</label>
          </div>
          <input
            id="item-satuan"
            name="item_satuan"
            autoComplete="off"
            type="text"
            placeholder='Contoh: pcs / botol'
            value={menuH.form.satuan || ""}
            onChange={e => menuH.setForm(f => ({ ...f, satuan:e.target.value }))}
            style={{ ...inp, marginBottom:6 }}
          />
          <div style={{ ...row, marginBottom:5 }}>
            <span style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:700 }}>SATUAN TAMBAHAN</span>
            <button
              onClick={() => menuH.setForm(f => ({ ...f, units:[...(f.units||[]), { key:"", label:"", factor:"", harga:"" }] }))}
              style={{ fontSize:TYPOGRAPHY.label.fontSize, padding:"2px 8px", borderRadius:RADIUS.sm, border:`1px solid ${G}`, background:COLOR_PALETTE.primaryLight, color:G, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}
            >+ Satuan</button>
          </div>
          {(menuH.form.units || []).length === 0 && (
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontStyle:"italic", marginBottom:4 }}>
              Belum ada. Item tanpa satuan tambahan tetap seperti biasa.
            </div>
          )}
          {(menuH.form.units || []).map((u, idx) => (
            <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr 0.8fr 1fr 20px", gap:4, marginBottom:4, alignItems:"center" }}>
              <input type="text" placeholder="kode" value={u.key}
                id={`unit-key-${idx}`} name={`unitKey_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.units]; a[idx]={...a[idx], key:e.target.value}; return {...f, units:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <input type="text" placeholder="label" value={u.label}
                id={`unit-label-${idx}`} name={`unitLabel_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.units]; a[idx]={...a[idx], label:e.target.value}; return {...f, units:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <input type="number" min="2" placeholder="faktor" value={u.factor}
                id={`unit-factor-${idx}`} name={`unitFactor_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.units]; a[idx]={...a[idx], factor:e.target.value}; return {...f, units:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <input type="text" placeholder="harga" value={u.harga}
                id={`unit-harga-${idx}`} name={`unitHarga_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.units]; a[idx]={...a[idx], harga:e.target.value.replace(/\D/g,"")}; return {...f, units:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <button onClick={() => menuH.setForm(f => ({ ...f, units:f.units.filter((_,i)=>i!==idx) }))}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:12 }}>&times;</button>
            </div>
          ))}
          <div style={{ fontSize:9, color:MT, marginBottom:2 }}>
            Faktor = jumlah satuan dasar per 1 satuan ini (min. 2). Key dipakai di strukt/invoice.
          </div>
        </div>

        {/* Langkah 3: tier harga */}
        <div style={{ borderTop:`1px solid ${BD}`, paddingTop:10, marginBottom:12 }}>
          <div style={{ ...row, marginBottom:5 }}>
            <label style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontWeight:700 }}>TIER HARGA (satuan dasar)</label>
            <button
              onClick={() => menuH.setForm(f => ({ ...f, priceTiers:[...(f.priceTiers||[]), { minQty:"", harga:"" }] }))}
              style={{ fontSize:TYPOGRAPHY.label.fontSize, padding:"2px 8px", borderRadius:RADIUS.sm, border:`1px solid ${G}`, background:COLOR_PALETTE.primaryLight, color:G, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}
            >+ Tier</button>
          </div>
          {(menuH.form.priceTiers || []).length === 0 && (
            <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, fontStyle:"italic" }}>
              Belum ada. Harga mengikuti harga jual untuk semua kuantitas.
            </div>
          )}
          {(menuH.form.priceTiers || []).map((tr, idx) => (
            <div key={idx} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 20px", gap:4, marginBottom:4, alignItems:"center" }}>
              <input type="number" min="1" placeholder="min. qty" value={tr.minQty}
                id={`tier-minqty-${idx}`} name={`tierMinQty_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.priceTiers]; a[idx]={...a[idx], minQty:e.target.value}; return {...f, priceTiers:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <input type="text" placeholder="harga/pcs" value={tr.harga}
                id={`tier-harga-${idx}`} name={`tierHarga_${idx}`}
                onChange={e => menuH.setForm(f => { const a=[...f.priceTiers]; a[idx]={...a[idx], harga:e.target.value.replace(/\D/g,"")}; return {...f, priceTiers:a}; })} style={{ ...inp, fontSize:TYPOGRAPHY.label.fontSize, padding:"4px 5px" }} />
              <button onClick={() => menuH.setForm(f => ({ ...f, priceTiers:f.priceTiers.filter((_,i)=>i!==idx) }))}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:12 }}>&times;</button>
            </div>
          ))}
          <div style={{ fontSize:9, color:MT }}>
            Tier aktif otomatis kalau total qty (satuan dasar) satu baris &ge; min. qty.
          </div>
        </div>

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
