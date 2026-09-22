import { BD, MT, G, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../../constants/design.js";
import { fieldStyle, SaveButton } from "./shared.jsx";

function WarungField({ label, value, onChange, onSave, placeholder, note, id = "warung-field" }) {
  return <div style={{ paddingTop: 12, borderTop: `1px solid ${BD}` }}>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>{label}</div>
    <div style={{ display: "flex", gap: 7 }}><input id={id} name={id} autoComplete="off" type="text" value={value || ""} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSave(value)} placeholder={placeholder} style={{ ...fieldStyle, flex: 1 }} /><SaveButton onClick={() => onSave(value)} /></div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 8 }}>{note}</div>
  </div>;
}

export function WarungSettingsTab({ settingsH }) {
  const settings = settingsH.settings;
  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>Atur nama warung/kios/restoran, alamat, dan nomor telepon yang akan tampil di resi pembayaran.</div>
    <div style={{ marginBottom: 12 }}><div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: G, marginBottom: 8 }}>Info Warung Saat Ini:</div><div style={{ padding: 12, background: COLOR_PALETTE.primaryLight, borderRadius: RADIUS.md, border: "1px solid #b8ccf0" }}><div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>{settings.warungName || "Warung (default)"}</div>{settings.warungAddress && <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 4 }}>{settings.warungAddress}</div>}{settings.warungPhone && <div style={{ fontSize: TYPOGRAPHY.small.fontSize, color: MT, marginTop: 2 }}>{settings.warungPhone}</div>}</div></div>
    <WarungField id="warung-name" label="Ubah Nama Warung:" value={settingsH.warungNameInput} onChange={settingsH.setWarungNameInput} onSave={settingsH.setWarungName} placeholder="Nama warung/kios/restoran Anda" note={'Kosongkan untuk kembali ke default "Warung"'} />
    <WarungField id="warung-address" label="Alamat Warung:" value={settingsH.warungAddressInput} onChange={settingsH.setWarungAddressInput} onSave={settingsH.setWarungAddress} placeholder="Alamat lengkap warung" note="Kosongkan untuk menghapus alamat" />
    <WarungField id="warung-phone" label="Nomor Telepon Warung:" value={settingsH.warungPhoneInput} onChange={settingsH.setWarungPhoneInput} onSave={settingsH.setWarungPhone} placeholder="Nomor telepon/WA warung" note="Kosongkan untuk menghapus nomor telepon" />
  </div>;
}
