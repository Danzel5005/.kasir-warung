import { useEffect, useRef, useState } from "react";
import { G, W, BD, MT, LT, TX, row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";

const fieldStyle = {
  padding: "8px 10px",
  border: `1px solid ${BD}`,
  borderRadius: RADIUS.md,
  fontFamily: "inherit",
  fontSize: TYPOGRAPHY.small.fontSize,
};

function SaveButton({ children = "Simpan", onClick }) {
  return <button onClick={onClick} style={{ padding: "8px 14px", background: G, color: W, border: "none", borderRadius: RADIUS.md, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{children}</button>;
}

export function PrinterSettingsTab({ settingsH }) {
  const [loading, setLoading] = useState(false);
  const [paperWidth, setPaperWidth] = useState(settingsH.settings.receiptPaperWidthMm || 80);

  useEffect(() => setPaperWidth(settingsH.settings.receiptPaperWidthMm || 80), [settingsH.settings.receiptPaperWidthMm]);
  useEffect(() => {
    if (settingsH.printerList.length === 0 && !loading) {
      setLoading(true);
      settingsH.openPrinterModal?.().finally(() => setLoading(false));
    }
  }, [loading, settingsH.printerList.length, settingsH.openPrinterModal]);

  const selectWidth = (width) => {
    setPaperWidth(width);
    settingsH.setReceiptPaperWidth(width);
  };

  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>Pilih printer thermal untuk mencetak resi. Pastikan driver printer sudah terinstall.</div>
    <button onClick={() => settingsH.selectPrinter("")} style={{ width: "100%", padding: "8px 10px", border: `2px solid ${!settingsH.settings.printerName ? G : BD}`, borderRadius: RADIUS.md, background: !settingsH.settings.printerName ? COLOR_PALETTE.primaryLight : W, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, textAlign: "left", marginBottom: 6 }}>Default Printer Sistem</button>
    {settingsH.printerList.length === 0 ? <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center", padding: "10px 0" }}>Tidak ada printer terdeteksi. Pastikan driver terinstall.</div> : settingsH.printerList.map((printer) => <button key={printer.name} onClick={() => settingsH.selectPrinter(printer.name)} style={{ width: "100%", padding: "8px 10px", border: `2px solid ${settingsH.settings.printerName === printer.name ? G : BD}`, borderRadius: RADIUS.md, background: settingsH.settings.printerName === printer.name ? COLOR_PALETTE.primaryLight : W, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, textAlign: "left", marginBottom: 6, ...row }}><span>{printer.name}</span>{settingsH.settings.printerName === printer.name && <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: G, marginLeft: "auto" }}>✓</span>}</button>)}
    <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}`, marginTop: 10 }}>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Lebar Kertas Resi (mm):</div>
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <input type="number" min="30" max="210" value={paperWidth} onChange={(event) => setPaperWidth(event.target.value)} onKeyDown={(event) => event.key === "Enter" && settingsH.setReceiptPaperWidth(paperWidth)} placeholder="80" style={{ ...fieldStyle, width: 90 }} />
        <SaveButton onClick={() => settingsH.setReceiptPaperWidth(paperWidth)} />
        {[58, 80].map((width) => <button key={width} onClick={() => selectWidth(width)} style={{ padding: "6px 10px", background: Number(settingsH.settings.receiptPaperWidthMm) === width ? COLOR_PALETTE.primaryLight : W, border: `1px solid ${Number(settingsH.settings.receiptPaperWidthMm) === width ? G : BD}`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>{width}mm</button>)}
      </div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>Default 80mm. Gunakan 58mm untuk printer thermal mini. Rentang 30-210mm.</div>
    </div>
  </div>;
}

function WarungField({ label, value, onChange, onSave, placeholder, note }) {
  return <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>{label}</div>
    <div style={{ display: "flex", gap: 7 }}><input type="text" value={value || ""} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSave(value)} placeholder={placeholder} style={{ ...fieldStyle, flex: 1 }} /><SaveButton onClick={() => onSave(value)} /></div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>{note}</div>
  </div>;
}

export function WarungSettingsTab({ settingsH }) {
  const settings = settingsH.settings;
  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>Atur nama warung/kios/restoran, alamat, dan nomor telepon yang akan tampil di resi pembayaran.</div>
    <div style={{ marginBottom: 12 }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Info Warung Saat Ini:</div><div style={{ padding: 12, background: COLOR_PALETTE.primaryLight, borderRadius: RADIUS.md, border: "1px solid #b8ccf0" }}><div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>{settings.warungName || "Warung (default)"}</div>{settings.warungAddress && <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 4 }}>{settings.warungAddress}</div>}{settings.warungPhone && <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 2 }}>{settings.warungPhone}</div>}</div></div>
    <WarungField label="Ubah Nama Warung:" value={settingsH.warungNameInput} onChange={settingsH.setWarungNameInput} onSave={settingsH.setWarungName} placeholder="Nama warung/kios/restoran Anda" note={'Kosongkan untuk kembali ke default "Warung"'} />
    <WarungField label="Alamat Warung:" value={settingsH.warungAddressInput} onChange={settingsH.setWarungAddressInput} onSave={settingsH.setWarungAddress} placeholder="Alamat lengkap warung" note="Kosongkan untuk menghapus alamat" />
    <WarungField label="Nomor Telepon Warung:" value={settingsH.warungPhoneInput} onChange={settingsH.setWarungPhoneInput} onSave={settingsH.setWarungPhone} placeholder="Nomor telepon/WA warung" note="Kosongkan untuk menghapus nomor telepon" />
  </div>;
}

export function PaymentSettingsTab({ settingsH }) {
  const methods = settingsH.settings.paymentMethods || [];
  return <div><div style={{ marginBottom: 12 }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Metode Pembayaran Aktif:</div>{methods.length ? methods.map((method) => <div key={method.key} style={{ ...row, padding: "8px 10px", background: "linear-gradient(135deg, #f5fdf8, #e8f5ee)", borderRadius: RADIUS.md, marginBottom: 6, border: `1px solid ${COLOR_PALETTE.primaryLight}` }}><div style={{ flex: 1 }}><div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{method.label}</div><div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{method.category === "cash" ? "💵 Cash" : method.category === "qris" ? "📱 QRIS" : "🏦 Custom"}</div></div><button onClick={() => settingsH.deletePaymentMethod(method.key)} style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Hapus</button></div>) : <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center" }}>Tidak ada metode pembayaran</div>}</div><div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Tambah Metode Baru:</div><div style={{ display: "flex", gap: 7 }}><input type="text" value={settingsH.newPaymentLabel} onChange={(event) => settingsH.setNewPaymentLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && settingsH.addPaymentMethod()} placeholder="Nama metode (e.g., Transfer BRI)" style={{ ...fieldStyle, flex: 1 }} /><SaveButton children="Tambah" onClick={settingsH.addPaymentMethod} /></div></div></div>;
}

export function QrisSettingsTab({ settingsH }) {
  const imageRefs = useRef({});
  const methods = (settingsH.settings.paymentMethods || []).filter((method) => method.category === "qris");
  const images = settingsH.settings.qrisImages || {};
  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>Kelola gambar QRIS untuk setiap metode pembayaran. Gambar akan ditampilkan di resi pelanggan.</div>{methods.length ? methods.map((method) => { const hasImage = Boolean(images[method.key]); return <div key={method.key} style={{ padding: 12, background: COLOR_PALETTE.primaryLight, borderRadius: RADIUS.md, marginBottom: 10, border: "1px solid #a8d5b8" }}><div style={{ ...row, marginBottom: 8 }}><span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{method.label}</span>{hasImage && <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: G, fontWeight: 600 }}>✓ Ada gambar</span>}</div>{hasImage && <div style={{ marginBottom: 8 }}><img src={images[method.key]} alt={`QRIS ${method.label}`} style={{ maxWidth: "100%", maxHeight: 150, borderRadius: RADIUS.md, border: `1px solid ${BD}` }} /></div>}<input ref={(element) => { imageRefs.current[method.key] = element; }} type="file" accept="image/jpeg,image/png" onChange={(event) => event.target.files[0] && settingsH.handleQrisImageUpload(method.key, event.target.files[0])} style={{ display: "none" }} /><div style={{ display: "flex", gap: 6 }}><button onClick={() => imageRefs.current[method.key]?.click()} style={{ flex: 1, padding: "6px 10px", background: COLOR_PALETTE.infoLight, color: COLOR_PALETTE.info, border: "none", borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>{hasImage ? "Ganti Gambar" : "Upload Gambar"}</button>{hasImage && <button onClick={() => settingsH.deleteQrisImage(method.key)} style={{ padding: "6px 10px", background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Hapus</button>}</div></div>; }) : <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, textAlign: "center", padding: "10px 0" }}>Tidak ada metode QRIS yang tersedia</div>}</div>;
}

export function ReceiptSettingsTab({ settingsH }) {
  const fields = settingsH.settings.receiptAdditionals || [];
  return <div><div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>Atur field yang muncul di checkout dan resi. Toggle "Wajib" untuk membuat field required. Semua field dapat dihapus.</div>{fields.map((field) => <div key={field.key} style={{ padding: 10, background: COLOR_PALETTE.infoLight, borderRadius: RADIUS.md, marginBottom: 8, border: "1px solid #b8ccf0" }}><div style={{ ...row, marginBottom: 8 }}><div><span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{field.label}</span><div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>📋 Field Resi</div></div><button onClick={() => settingsH.deleteReceiptAdditional(field.key)} style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Hapus</button></div><button onClick={() => settingsH.toggleReceiptAdditionalRequired(field.key)} style={{ width: "100%", padding: "6px 10px", background: field.required ? G : BD, color: field.required ? W : MT, border: "none", borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>{field.required ? "✓ Wajib di isi" : "Tidak wajib"}</button></div>)}<div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BD}` }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Tambah Field Baru:</div><div style={{ display: "flex", gap: 7 }}><input type="text" value={settingsH.newReceiptFieldLabel} onChange={(event) => settingsH.setNewReceiptFieldLabel(event.target.value)} onKeyDown={(event) => event.key === "Enter" && settingsH.addReceiptField()} placeholder="Nama field (e.g., Catatan, Alamat)" style={{ ...fieldStyle, flex: 1 }} /><select value={settingsH.newReceiptFieldType} onChange={(event) => settingsH.setNewReceiptFieldType(event.target.value)} style={fieldStyle}><option value="text">Text</option><option value="number">Number</option></select><SaveButton children="Tambah" onClick={settingsH.addReceiptField} /></div></div></div>;
}

function getTargetName(entries, target) { const match = entries.find((entry) => String(entry.key || entry.id) === String(target)); return match?.label || match?.nama || target; }

export function PricingSettingsTab({ settingsH, menu, cats }) {
  const [draft, setDraft] = useState({ type: "percentage", value: "", scope: "global", target: "", minQty: "1", perChunk: false, chunkQty: "5" });
  const [search, setSearch] = useState("");
  const save = (patch) => settingsH.savePricing(patch);
  const entries = draft.scope === "category" ? cats : menu;
  const targets = entries.filter((entry) => !search.trim() || `${entry.label || entry.nama || ""} ${entry.key || entry.id || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const addDiscount = async () => {
    const value = Number(draft.value);
    if (String(draft.value).trim() === "" || !Number.isFinite(value) || value <= 0) return settingsH.toast_(String(draft.value).trim() === "" ? "Nilai diskon wajib diisi" : "Nilai diskon harus lebih besar dari 0", "err");
    if (draft.type === "percentage" && value > 100) return settingsH.toast_("Persentase diskon maksimal 100%", "err");
    if (draft.scope !== "global" && !draft.target) return settingsH.toast_("Target diskon wajib dipilih", "err");
    if (!Number.isFinite(Number(draft.minQty)) || Number(draft.minQty) < 1) return settingsH.toast_("Jumlah minimum harus minimal 1", "err");
    if (draft.perChunk && (!Number.isFinite(Number(draft.chunkQty)) || Number(draft.chunkQty) < 1)) return settingsH.toast_("Jumlah pembagian harus minimal 1", "err");
    await save({ discounts: [...(settingsH.settings.discounts || []), { id: `discount_${Date.now()}`, enabled: true, type: draft.type, value, scope: draft.scope, target: draft.scope === "global" ? "" : draft.target, minQty: Math.max(1, Number(draft.minQty)), perChunk: draft.perChunk, chunkQty: Math.max(1, Number(draft.chunkQty)) }] });
    setDraft({ ...draft, value: "", target: "" });
  };
  const discounts = settingsH.settings.discounts || [];
  return <div><div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 12 }}>Atur diskon bertingkat, pajak, dan service untuk transaksi baru.</div>{["pajak", "service"].map((key) => { const config = settingsH.settings[key] || { enabled: false, value: 0 }; return <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><input type="checkbox" checked={config.enabled !== false} onChange={(event) => save({ [key]: { ...config, enabled: event.target.checked } })} /><span style={{ width: 70, fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{key === "pajak" ? "Pajak" : "Service"}</span><input type="number" min="0" max="100" value={config.value || ""} onChange={(event) => save({ [key]: { ...config, value: Number(event.target.value) || 0 } })} style={{ ...inp, width: 90 }} /><span style={{ fontSize: TYPOGRAPHY.small.fontSize }}>%</span></div>; })}<div style={{ borderTop: `1px solid ${BD}`, paddingTop: 12, marginTop: 12 }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>Tambah Diskon</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} style={inp}><option value="percentage">Persentase (%)</option><option value="fixed">Nominal (Rp)</option></select><input type="number" min="0" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="Nilai diskon" style={inp} /><select value={draft.scope} onChange={(event) => { setDraft({ ...draft, scope: event.target.value, target: "" }); setSearch(""); }} style={inp}><option value="global">Semua item</option><option value="category">Kategori</option><option value="item">Item</option></select><input type="number" min="1" value={draft.minQty} onChange={(event) => setDraft({ ...draft, minQty: event.target.value })} placeholder="Min. jumlah" style={inp} /></div><label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, fontSize: TYPOGRAPHY.small.fontSize }}><input type="checkbox" checked={draft.perChunk} onChange={(event) => setDraft({ ...draft, perChunk: event.target.checked })} />Terapkan diskon per kelompok jumlah</label>{draft.perChunk && <input type="number" min="1" value={draft.chunkQty} onChange={(event) => setDraft({ ...draft, chunkQty: event.target.value })} placeholder="Jumlah per kelompok (contoh: 5)" style={{ ...inp, width: "100%", marginTop: 7 }} />}{draft.scope !== "global" && <><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Cari ${draft.scope === "category" ? "kategori" : "item"}...`} style={{ ...inp, width: "100%", marginTop: 7 }} /><div style={{ border: `1px solid ${BD}`, borderRadius: RADIUS.md, marginTop: 7, maxHeight: 150, overflowY: "auto" }}>{targets.length ? targets.map((entry) => <button key={entry.key || entry.id} type="button" onClick={() => setDraft({ ...draft, target: entry.key || entry.id })} style={{ display: "block", width: "100%", padding: "8px 10px", border: "none", borderBottom: `1px solid ${BD}`, background: draft.target === (entry.key || entry.id) ? COLOR_PALETTE.primaryLight : W, color: TX, textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize }}>{entry.label || entry.nama}</button>) : <div style={{ padding: "8px 10px", color: MT, fontSize: TYPOGRAPHY.small.fontSize }}>Tidak ada nama yang cocok untuk item/kategori tersebut!</div>}</div><div style={{ marginTop: 5, fontSize: TYPOGRAPHY.label.fontSize, color: draft.target ? G : MT }}>{draft.target ? `Terpilih: ${getTargetName(entries, draft.target)}` : `Pilih ${draft.scope === "category" ? "kategori" : "item"} dari hasil pencarian`}</div></>}<SaveButton children="Tambah Diskon" onClick={addDiscount} /></div><div style={{ marginTop: 14 }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>Diskon Aktif dan Tersimpan:</div>{discounts.map((rule) => <div key={rule.id} style={{ ...row, alignItems: "flex-start", padding: "8px 10px", background: rule.enabled === false ? LT : COLOR_PALETTE.primaryLight, borderRadius: RADIUS.md, marginBottom: 6 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700, color: rule.enabled === false ? MT : TX }}>{rule.scope === "global" ? "Semua item dan kategori" : `${rule.scope === "category" ? "Kategori" : "Item"}: ${getTargetName(rule.scope === "category" ? cats : menu, rule.target)}`}</div><div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 3 }}>Diskon {rule.type === "fixed" ? `Rp ${Number(rule.value || 0).toLocaleString("id-ID")}` : `${rule.value || 0}%`} • Minimal {rule.minQty || 1} item{rule.perChunk ? ` • Per ${rule.chunkQty || 1} item` : ""}</div></div><button onClick={() => save({ discounts: discounts.map((item) => item.id === rule.id ? { ...item, enabled: item.enabled === false } : item) })} style={{ ...inp, width: "auto", padding: "4px 7px", cursor: "pointer" }}>{rule.enabled === false ? "Aktifkan" : "Matikan"}</button><button onClick={() => save({ discounts: discounts.filter((item) => item.id !== rule.id) })} style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "4px 7px", cursor: "pointer" }}>Hapus</button></div>)}</div></div>;
}

export function UsersSettingsTab({ authH }) {
  const [newUser, setNewUser] = useState({ username: "", password: "", nama: "" });
  const canManage = authH?.currentUser?.role === "admin";
  const submit = async () => { const user = { username: newUser.username.trim(), password: newUser.password.trim(), nama: newUser.nama.trim() }; if (!user.username || !user.password || !user.nama) return; if (await authH.addUser(user)) setNewUser({ username: "", password: "", nama: "" }); };
  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
        Kelola pengguna yang bisa login ke sistem kasir.
        </div>
    <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>
        Daftar Pengguna ({authH?.users?.length || 0}):
        </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {authH?.users?.map((user) => 
        <div key={user.username} style={{ ...row, padding: "7px 10px", background: LT, borderRadius: RADIUS.md }}>
            <div>
        <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>
                {user.nama}{user.username === authH?.currentUser?.username ? " (Anda)" : ""}
        </div>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
                @{user.username}
                </div>
            </div>{!canManage ? <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Hanya admin</span> : user.username === "admin" ? <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Utama (tidak bisa dihapus)</span> : user.username === authH?.currentUser?.username ? <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontStyle: "italic" }}>Akun sendiri</span> : <button onClick={() => authH.deleteUser(user.username)} style={{ background: COLOR_PALETTE.dangerLight, color: COLOR_PALETTE.danger, border: "none", borderRadius: RADIUS.sm, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600 }}>Hapus</button>}</div>)}</div></div><div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Tambah Pengguna Baru:</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[["nama", "Nama Lengkap (e.g., Kasir Budi)"], ["username", "Username (e.g., kasir1)"], ["password", "Password (min. 4 karakter)"]].map(([key, placeholder]) => <input key={key} type={key === "password" ? "password" : "text"} placeholder={placeholder} value={newUser[key]} onChange={(event) => setNewUser({ ...newUser, [key]: event.target.value })} onKeyDown={(event) => event.key === "Enter" && key === "password" && submit()} style={inp} />)}<button onClick={submit} disabled={!newUser.username.trim() || !newUser.password.trim() || !newUser.nama.trim()} style={{ padding: "8px 14px", background: newUser.username.trim() && newUser.password.trim() && newUser.nama.trim() ? G : "#aaa", color: W, border: "none", borderRadius: RADIUS.md, cursor: newUser.username.trim() && newUser.password.trim() && newUser.nama.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>+ Tambah Pengguna</button></div></div></div>;
}
