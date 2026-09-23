import { W, BD, MT, TX, RADIUS, TYPOGRAPHY } from "../../constants/design.js";

// SupplierListModal — modal daftar SEMUA supplier (dibuka dari tombol
// "Lihat semua supplier" di panel Supplier pada halaman Fitur Lanjutan).
// Panel hanya menampilkan 5 supplier; sisanya dibuka di modal ini sebagai
// daftar NAMA saja (tanpa kartu/dropdown, tanpa detail per item).
//
// Props:
//   list     - daftar supplier yang ditampilkan (sudah difilter oleh pemanggil)
//   search   - nilai kata kunci pencarian saat ini
//   onSearch - callback perubahan kata kunci
//   onClose  - callback tutup
export default function SupplierListModal({ list = [], search = "", onSearch, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}
      onClick={onClose}
    >
      <div
        style={{ background: W, borderRadius: RADIUS.lg, width: "min(520px, 92vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: TX }}>Semua Supplier</div>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{list.length} supplier</div>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: MT, fontSize: 16 }}
            aria-label="Tutup"
          >
            &#10005;
          </button>
        </div>

        <div style={{ padding: "10px 16px 6px" }}>
          <input
            id="supplier-list-search"
            name="supplierListSearch"
            value={search}
            onChange={(e) => onSearch?.(e.target.value)}
            placeholder="Cari nama supplier..."
            aria-label="Cari supplier"
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${BD}`, borderRadius: RADIUS.sm, padding: "6px 8px", fontSize: TYPOGRAPHY.small.fontSize, fontFamily: "inherit", background: W }}
          />
        </div>

        <div style={{ padding: "4px 16px 14px", overflowY: "auto" }}>
          {list.length === 0 ? (
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, padding: "10px 0" }}>
              Tidak ada supplier cocok.
            </div>
          ) : (
            list.map((s) => (
              <div
                key={s.id}
                style={{ padding: "8px 2px", borderBottom: `1px solid ${BD}`, fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 600, color: TX }}
              >
                {s.nama}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
