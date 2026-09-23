import { useMemo } from "react";
import { G, W, BD, LT, MT, TX, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { bahanBakuUsage } from "../../utilities/resepHpp.js";
import { supplierLabel } from "../../utilities/supplier.js";

// BahanDetailModal — modal detail satu bahan baku (dibuka dari daftar Bahan
// Baku pada halaman Fitur Lanjutan). Menampilkan Stok, Minimum, Harga Satuan,
// dan di resep menu mana saja bahan ini dipakai (beserta qty per porsi).
//
// zIndex sengaja LEBIH TINGGI dari BahanListModal (1100) supaya modal detail
// ini selalu tampil di atas modal daftar nama-nama bahan, termasuk saat dibuka
// dari dalam modal daftar tersebut.
//
// Props:
//   bahan      - entri bahan baku { id, nama, satuan, stok, minStok, hargaSatuan }
//   resep      - map menuId -> [{ bahanId, qty }]
//   menu       - daftar menu [{ id, nama }]
//   suppliers  - daftar supplier (opsional, untuk label)
//   onClose    - callback tutup
export default function BahanDetailModal({ bahan, resep, menu, suppliers, onClose }) {
  const usage = useMemo(
    () => (bahan ? bahanBakuUsage(bahan.id, resep, menu) : []),
    [bahan, resep, menu]
  );

  if (!bahan) return null;

  const stok = Number(bahan.stok) || 0;
  const minStok = Number(bahan.minStok) || 0;
  const low = stok <= minStok;
  const satuan = bahan.satuan || "-";
  const money = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

  const infoRow = (label, value, color) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${BD}` }}>
      <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{label}</span>
      <span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700, color: color || TX }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}
      onClick={onClose}
    >
      <div
        style={{ background: W, borderRadius: RADIUS.lg, width: "min(460px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>{bahan.nama}</div>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              Satuan {satuan}
              {bahan.supplierId ? ` \u00B7 ${supplierLabel(suppliers || [], bahan.supplierId)}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: MT, fontSize: 16 }}
          >
            &#10005;
          </button>
        </div>

        <div style={{ padding: "12px 16px" }}>
          {infoRow("Stok saat ini", `${stok} ${satuan}`, low ? COLOR_PALETTE.danger : undefined)}
          {infoRow("Minimum stok", `${minStok} ${satuan}`)}
          {infoRow("Harga satuan", money(bahan.hargaSatuan))}
          {infoRow("Nilai stok", money(stok * (Number(bahan.hargaSatuan) || 0)))}

          {low && (
            <div style={{ marginTop: 8, fontSize: TYPOGRAPHY.label.fontSize, color: COLOR_PALETTE.danger, fontWeight: 700 }}>
              &#9888; Stok di bawah/ sama dengan minimum — segera restock
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 800, color: MT, letterSpacing: 0.3, textTransform: "uppercase" }}>
            Dipakai di resep ({usage.length})
          </div>

          {usage.length === 0 ? (
            <div style={{ marginTop: 6, fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              Bahan ini belum dipakai di resep menu mana pun.
            </div>
          ) : (
            <div style={{ marginTop: 6 }}>
              {usage.map((u) => (
                <div
                  key={u.menuId}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: LT, borderRadius: RADIUS.sm, padding: "6px 10px", marginBottom: 5 }}
                >
                  <span style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600 }}>{u.nama}</span>
                  <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
                    {u.qty} {satuan} / porsi
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
