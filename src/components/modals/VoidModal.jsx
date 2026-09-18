import { memo, useState } from "react";
import { G, OR, W, BD, TX, MT, row, inp, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
const VOID_REASONS = [
	{ key: "cancel", label: "Pembatalan pelanggan" },
	{ key: "refund", label: "Pengembalian" },
	{ key: "error", label: "Kesalahan input" },
	{ key: "promotion", label: "Promo gratis" },
	{ key: "other", label: "Lainnya" },
];

const VoidModal = ({ voidTargetId, setVoidTargetId, voidReason, setVoidReason, voidNote, setVoidNote, voidTrx }) => {
	if (!voidTargetId) return null;
	const canVoid = !!voidReason;
	return (
		<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:310 }}>
			<div style={{background:W,borderRadius:RADIUS.lg,padding:"20px",width:400,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
				<div style={{ fontSize: 18, fontWeight: 700, color: COLOR_PALETTE.danger, marginBottom: 8 }}>Void Transaksi</div>
				<div style={{ fontSize: 12, color: MT, marginBottom: 10 }}>Transaksi ini akan ditandai sebagai void dan tidak akan dihitung dalam laporan penjualan.</div>
				<div style={{ marginBottom: 10 }}>
					<label style={{ fontSize: 11, fontWeight: 700, color: G, marginBottom: 5 }}>Alasan Void *</label>
					<select value={voidReason} onChange={(event) => setVoidReason(event.target.value)} style={{ ...inp, width: "100%" }}>
						{VOID_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
					</select>
				</div>
				<div style={{ marginBottom: 10 }}>
					<label style={{ fontSize: 11, fontWeight: 700, color: G, marginBottom: 5 }}>Catatan Tambahan</label>
					<input type="text" value={voidNote} onChange={(event) => setVoidNote(event.target.value)} placeholder="Opsional" style={{ ...inp, width: "100%" }} />
				</div>
				<div style={{ display: "flex", gap: 8, marginTop: 14 }}>
					<button onClick={() => setVoidTargetId(null)} style={{ flex: 1, padding: 8, border: `1px solid ${BD}`, background: W, borderRadius: RADIUS.md, cursor: "pointer" }}>Batal</button>
		            <button onClick={() => { voidTrx(voidTargetId, voidReason); }} disabled={!canVoid} style={{ flex: 1, padding: 8, background: canVoid ? COLOR_PALETTE.danger : "#aaa", color: W, border: "none", borderRadius: RADIUS.md, cursor: canVoid ? "pointer" : "not-allowed", fontWeight: 700 }}>Konfirmasi Void</button>
				</div>
			</div>
		</div>
	);
};

export default memo(VoidModal);
