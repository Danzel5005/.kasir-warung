import { memo, useMemo, useState } from "react";
import { BD, MT, TYPOGRAPHY, row } from "../../constants/design.js";
import SupplierListModal from "../modals/SupplierListModal.jsx";
import { sectionTitle, card, label, input, btnPrimary, btnGhost, btnDanger } from "./PanelStyles.js";

// Batas jumlah supplier yang tampil di daftar ringkas Supplier. Sisa supplier
// dibuka di SupplierListModal (pola sama dengan Bahan Baku).
const SUPPLIER_COLLAPSE_LIMIT = 5;

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------
function SupplierPanel({ advancedData, toast_ }) {
  const empty = { id: "", nama: "", kontak: "", telepon: "", alamat: "", catatan: "" };
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const editing = !!form.id;
  const reset = () => setForm(empty);

  const submit = async () => {
    if (!String(form.nama).trim()) {
      toast_?.("Nama supplier wajib diisi", "err");
      return;
    }
    advancedData.upsertSupplier(form);
    toast_?.(editing ? "Supplier diperbarui" : `Supplier "${form.nama}" ditambahkan`, "ok");
    reset();
  };

  const remove = async (s) => {
    advancedData.deleteSupplier(s.id);
    toast_?.(`Supplier "${s.nama}" dihapus`, "ok");
  };

  const list = advancedData.supplier || [];

  // Filter nama supplier (case-insensitive). Panel selalu menampilkan maks
  // SUPPLIER_COLLAPSE_LIMIT; sisa supplier dibuka di SupplierListModal.
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? list.filter((s) => String(s.nama || "").toLowerCase().includes(q)) : list),
    [list, q]
  );
  const visible = filtered.slice(0, SUPPLIER_COLLAPSE_LIMIT);
  const hiddenCount = filtered.length - visible.length;
  const collapseLabel = q ? "Lihat semua hasil" : "Lihat semua supplier";

  return (
    <div style={card}>
      <div style={{ ...sectionTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span>Supplier ({list.length})</span>
        {q && (
          <span style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: MT, textTransform: "none", letterSpacing: 0 }}>
            {filtered.length} hasil
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={label}>Nama supplier</div>
          <input id="supplier-nama" name="supplierNama" style={input} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth: CV Kopi Nusantara" />
        </div>
        <div>
          <div style={label}>Kontak (PIC)</div>
          <input id="supplier-kontak" name="supplierKontak" style={input} value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} placeholder="Nama PIC" />
        </div>
        <div>
          <div style={label}>Telepon</div>
          <input id="supplier-telepon" name="supplierTelepon" style={input} value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="08xx" />
        </div>
        <div>
          <div style={label}>Alamat</div>
          <input id="supplier-alamat" name="supplierAlamat" style={input} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Kota / alamat" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: list.length ? 10 : 0 }}>
        <button style={btnPrimary} onClick={submit}>{editing ? "Simpan Perubahan" : "+ Tambah Supplier"}</button>
        {editing && <button style={btnGhost} onClick={reset}>Batal</button>}
      </div>

      {list.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <input
            id="supplier-search"
            name="supplierSearch"
            style={input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama supplier..."
            aria-label="Cari supplier"
          />
        </div>
      )}

      {q && filtered.length === 0 && (
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, padding: "4px 0" }}>
          Tidak ada supplier cocok dengan "{search.trim()}".
        </div>
      )}

      {visible.map((s) => (
        <div key={s.id} style={{ ...row, borderTop: `1px solid ${BD}`, padding: "6px 0", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>{s.nama}</div>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              {[s.kontak, s.telepon, s.alamat].filter(Boolean).join(" \u00B7 ") || "-"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button style={btnGhost} onClick={() => setForm({ ...empty, ...s })}>Edit</button>
            <button style={btnDanger} onClick={() => remove(s)}>Hapus</button>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div style={{ marginTop: 8 }}>
          <button style={btnGhost} onClick={() => setShowAll(true)}>
            {collapseLabel} ({hiddenCount} lainnya)
          </button>
        </div>
      )}

      {showAll && (
        <SupplierListModal
          list={filtered}
          search={search}
          onSearch={setSearch}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

export default memo(SupplierPanel);
