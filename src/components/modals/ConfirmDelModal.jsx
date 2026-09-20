import { useEffect, useState } from "react";
import { W, BD, MT, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { api } from "../../utilities/utils.js";

const LABELS = {
  all:      "Hapus SEMUA riwayat?",
  trx:      "Hapus transaksi ini?",
  allBills: "Hapus SEMUA open bill?",
  bill:     "Hapus open bill ini?",
  allMenu:  "Hapus SEMUA menu?",
};

// Tipe yang punya langkah kedua "kembalikan stok?" (Langkah 2b).
const STOCK_TYPES = ["trx", "all"];

export default function ConfirmDelModal({ confirmDel, setConfirmDel, executeConfirmDel }) {
  const label = LABELS[confirmDel.type] ?? "Hapus menu ini?";
  const isStockType = STOCK_TYPES.includes(confirmDel.type);

  // step: 1 = konfirmasi hapus, 2 = tanya kembalikan stok (hanya trx/all).
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(null);

  // Ambil ringkasan sekali saat modal dibuka untuk tipe stok.
  useEffect(() => {
    let live = true;
    if (!isStockType) return undefined;
    const q = confirmDel.type === "all" ? { all: true } : { id: confirmDel.id };
    api.restorePreview(q)
      .then((res) => { if (live) setPreview(res || { trxCount: 0, totalQty: 0 }); })
      .catch(() => { if (live) setPreview({ trxCount: 0, totalQty: 0 }); });
    return () => { live = false; };
  }, [confirmDel.type, confirmDel.id, isStockType]);

  const totalQty = preview?.totalQty ?? 0;
  const trxCount = preview?.trxCount ?? 0;

  // Kalau tidak ada unit yang bisa dikembalikan (semua void / tanpa stok),
  // langsung hapus tanpa pertanyaan kedua.
  const goDelete = () => {
    if (isStockType && totalQty > 0) { setStep(2); return; }
    executeConfirmDel(false);
  };

  const wrap = (children) => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
      <div style={{ background:W, borderRadius:RADIUS.lg, padding:"20px", width:285, textAlign:"center", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize:28, marginBottom:8 }}>&#128465;</div>
        {children}
      </div>
    </div>
  );

  const btnBase = { flex:1, padding:9, borderRadius:RADIUS.md, cursor:"pointer", fontFamily:"inherit", fontSize:TYPOGRAPHY.small.fontSize, fontWeight:600 };

  if (step === 2) {
    return wrap(
      <>
        <div style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, marginBottom:5 }}>
          Kembalikan stok?
        </div>
        <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, marginBottom:8 }}>
          {confirmDel.type === "all"
            ? "Apakah anda ingin mengembalikan stok untuk item pada semua transaksi?"
            : "Apakah anda ingin mengembalikan stok untuk item pada transaksi ini?"}
        </div>
        <div style={{ fontSize:TYPOGRAPHY.label.fontSize, fontWeight:700, color:COLOR_PALETTE.danger, marginBottom:14 }}>
          +{totalQty} unit dari {trxCount} transaksi
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button
            autoFocus
            onClick={() => executeConfirmDel(false)}
            style={{ ...btnBase, flex:"1 1 40%", border:`1px solid ${BD}`, background:W, fontWeight:700 }}
          >Tidak</button>
          <button
            onClick={() => executeConfirmDel(true)}
            style={{ ...btnBase, flex:"1 1 40%", border:`1px solid ${COLOR_PALETTE.danger}`, background:W, color:COLOR_PALETTE.danger, fontWeight:700 }}
          >Ya, kembalikan</button>
          <button
            onClick={() => setConfirmDel(null)}
            style={{ ...btnBase, flex:"1 1 100%", border:`1px solid ${BD}`, background:W }}
          >Batal</button>
        </div>
      </>
    );
  }

  return wrap(
    <>
      <div style={{ fontSize:TYPOGRAPHY.body.fontSize, fontWeight:700, marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:TYPOGRAPHY.label.fontSize, color:MT, marginBottom:14 }}>Tindakan ini dapat di-undo dalam 9 detik.</div>
      <div style={{ display:"flex", gap:8 }}>
        <button
          onClick={() => setConfirmDel(null)}
          style={{ ...btnBase, border:`1px solid ${BD}`, background:W }}
        >Batal</button>
        <button
          onClick={goDelete}
          style={{ ...btnBase, background:COLOR_PALETTE.danger, color:W, border:"none", fontWeight:700 }}
        >Hapus</button>
      </div>
    </>
  );
}
