import { W, BD, MT } from "../../constants/colors.js";
import { RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/theme.js";

const LABELS = {
  all:      "Hapus SEMUA riwayat?",
  trx:      "Hapus transaksi ini?",
  allBills: "Hapus SEMUA open bill?",
  bill:     "Hapus open bill ini?",
  allMenu:  "Hapus SEMUA menu?",
};

export default function ConfirmDelModal({ confirmDel, setConfirmDel, executeConfirmDel }) {
  const label = LABELS[confirmDel.type] ?? "Hapus menu ini?";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"20px", width:285, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>&#128465;</div>
        <div style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, marginBottom:5 }}>{label}</div>
        <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, marginBottom:14 }}>Tindakan ini dapat di-undo dalam 9 detik.</div>
        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={() => setConfirmDel(null)}
            style={{ flex:1, padding:9, border:`1px solid ${BD}`, borderRadius:RADIUS.md, background:W, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 }}
          >Batal</button>
          <button
            onClick={executeConfirmDel}
            style={{ flex:1, padding:9, background:COLOR_PALETTE.danger, color:W, border:"none", borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:700 }}
          >Hapus</button>
        </div>
      </div>
    </div>
  );
}
