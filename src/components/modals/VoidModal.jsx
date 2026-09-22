import { memo } from "react";
import { G, W, BD, TX, MT, inp, RADIUS, COLOR_PALETTE } from "../../constants/design.js";
import { VOID_REASONS } from "../../hooks/useHistoryVoid.js";

// VoidModal — confirmation dialog for marking a transaction as void.
// Void never deletes the sale: it flags it so reports exclude it while the
// audit trail (who/when/why) stays intact.
const VoidModal = ({ voidTargetId, voidReason, setVoidReason, voidNote, setVoidNote, isVoiding = false, onClose, onConfirm }) => {
	if (!voidTargetId) return null;
	const canVoid = !!voidReason && !isVoiding;

	return (
		<div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:310 }}
			onClick={() => { if (!isVoiding) onClose?.(); }}>
			<div style={{background:W,borderRadius:RADIUS.lg,padding:"20px",width:400,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}
				onClick={(e) => e.stopPropagation()}>
				<div style={{ fontSize: 18, fontWeight: 700, color: COLOR_PALETTE.danger, marginBottom: 4 }}>Void Transaksi #{voidTargetId}</div>
				<div style={{ fontSize: 12, color: MT, marginBottom: 14 }}>
					Transaksi ini akan ditandai sebagai <b>void</b> dan tidak akan dihitung dalam laporan penjualan.
					Data transaksi tetap tersimpan sebagai jejak audit.
				</div>
				<div style={{ marginBottom: 10 }}>
					<label style={{ fontSize: 11, fontWeight: 700, color: G, marginBottom: 5, display:"block" }}>Alasan Void *</label>
					<select id="void-reason" name="voidReason" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} disabled={isVoiding} style={{ ...inp, width: "100%" }}>
						{VOID_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
					</select>
				</div>
				<div style={{ marginBottom: 10 }}>
					<label style={{ fontSize: 11, fontWeight: 700, color: G, marginBottom: 5, display:"block" }}>Catatan Tambahan</label>
					<input id="void-note" name="voidNote" type="text" value={voidNote} onChange={(event) => setVoidNote(event.target.value)} disabled={isVoiding} placeholder="Opsional" style={{ ...inp, width: "100%" }} />
				</div>
				<div style={{ display: "flex", gap: 8, marginTop: 14 }}>
					<button onClick={onClose} disabled={isVoiding}
						style={{ flex: 1, padding: 8, border: `1px solid ${BD}`, background: W, borderRadius: RADIUS.md, cursor: isVoiding ? "not-allowed" : "pointer", fontFamily:"inherit", color:TX, opacity: isVoiding ? 0.6 : 1 }}>
						Batal
					</button>
					<button onClick={onConfirm} disabled={!canVoid}
						style={{ flex: 1, padding: 8, background: canVoid ? COLOR_PALETTE.danger : "#aaa", color: W, border: "none", borderRadius: RADIUS.md, cursor: canVoid ? "pointer" : "not-allowed", fontWeight: 700, fontFamily:"inherit" }}>
						{isVoiding ? "Memproses..." : "Konfirmasi Void"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default memo(VoidModal);
