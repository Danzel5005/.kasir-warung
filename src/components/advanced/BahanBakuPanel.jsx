import { memo, useMemo, useRef, useState } from "react";
import { BD, MT, TX, RADIUS, TYPOGRAPHY, COLOR_PALETTE, row } from "../../constants/design.js";
import BahanDetailModal from "../modals/BahanDetailModal.jsx";
import BahanListModal from "../modals/BahanListModal.jsx";
import { sectionTitle, card, label, input, btnPrimary, btnGhost, btnDanger, money } from "./PanelStyles.js";

// Batas jumlah bahan yang tampil di daftar ringkas Bahan Baku. Bila daftar
// (hasil filter) lebih banyak dari ini, sisanya disembunyikan dan muncul
// tombol "Lihat semua bahan" yang membuka modal daftar lengkap.
const BAHAN_COLLAPSE_LIMIT = 5;

// ---------------------------------------------------------------------------
// Bahan Baku
// ---------------------------------------------------------------------------
function BahanBakuPanel({ advancedData, toast_, addUndo, suppliers, menu }) {
  const panelRef = useRef(null);
  const [form, setForm] = useState({ id: "", nama: "", satuan: "", stok: "", minStok: "", hargaSatuan: "", supplierId: "" });
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const editing = !!form.id;

  const reset = () =>
    setForm({ id: "", nama: "", satuan: "", stok: "", minStok: "", hargaSatuan: "", supplierId: "" });

  const submit = async () => {
    if (!String(form.nama).trim()) {
      toast_?.("Nama bahan wajib diisi", "err");
      return;
    }
    advancedData.upsertBahan(form);
    toast_?.(editing ? "Bahan diperbarui" : `Bahan "${form.nama}" ditambahkan`, "ok");
    reset();
  };

  const editRow = (b) => {
    setForm({
      id: b.id,
      nama: b.nama,
      satuan: b.satuan,
      stok: String(b.stok),
      minStok: String(b.minStok),
      hargaSatuan: String(b.hargaSatuan),
      supplierId: b.supplierId || "",
    });
    setShowAll(false);
    setDetail(null);
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("bahan-nama")?.focus({ preventScroll: true });
    });
  };

  const remove = async (b) => {
    const snapshot = { ...b };
    advancedData.deleteBahan(b.id);
    addUndo?.(`Hapus bahan "${b.nama}"`, () => advancedData.upsertBahan(snapshot));
    if (detail?.id === b.id) setDetail(null);
    toast_?.(`Bahan "${b.nama}" dihapus`, "ok");
  };

  const list = advancedData.bahanBaku || [];

  // Filter nama bahan (case-insensitive). Daftar ringkas dibatasi
  // BAHAN_COLLAPSE_LIMIT; label "Lihat semua" menyesuaikan hasil filter.
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? list.filter((b) => String(b.nama || "").toLowerCase().includes(q)) : list),
    [list, q]
  );
  // Panel selalu menampilkan maksimal BAHAN_COLLAPSE_LIMIT (5) bahan. Sisa
  // bahan tidak dilipat di panel, melainkan dibuka di BahanListModal.
  const visible = filtered.slice(0, BAHAN_COLLAPSE_LIMIT);
  const hiddenCount = filtered.length - visible.length;
  const collapseLabel = q ? "Lihat semua hasil" : "Lihat semua bahan";

  return (
    <div ref={panelRef} style={card}>
      <div style={{ ...sectionTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span>Bahan Baku ({list.length})</span>
        {q && (
          <span style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: MT, textTransform: "none", letterSpacing: 0 }}>
            {filtered.length} hasil
          </span>
        )}
      </div>

      {advancedData.lowStock?.length > 0 && (
        <div role="alert" style={{ background: "#fff5f5", border: "1px solid #f5c0c0", borderRadius: RADIUS.sm, padding: "8px 10px", marginBottom: 10 }}>
          <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700, color: COLOR_PALETTE.danger, marginBottom: 6 }}>
            ⚠️ {advancedData.lowStock.length} bahan baku stok menipis atau habis
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {advancedData.lowStock.map((bahan) => (
              <div key={bahan.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: TYPOGRAPHY.label.fontSize, color: TX }}>
                <span>{bahan.nama}</span>
                <span style={{ color: COLOR_PALETTE.danger, fontWeight: 700 }}>
                  Sisa {bahan.stok} {bahan.satuan} · Minimal {bahan.minStok} {bahan.satuan}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={label}>Nama bahan</div>
          <input id="bahan-nama" name="bahanNama" style={input} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth: Biji Kopi Arabika" />
        </div>
        <div>
          <div style={label}>Satuan</div>
          <input id="bahan-satuan" name="bahanSatuan" style={input} value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="gram / ml / pcs" />
        </div>
        <div>
          <div style={label}>Stok</div>
          <input id="bahan-stok" name="bahanStok" style={input} type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Min. stok (peringatan)</div>
          <input id="bahan-minstok" name="bahanMinStok" style={input} type="number" value={form.minStok} onChange={(e) => setForm({ ...form, minStok: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Harga / satuan</div>
          <input id="bahan-hargasatuan" name="bahanHargaSatuan" style={input} type="number" value={form.hargaSatuan} onChange={(e) => setForm({ ...form, hargaSatuan: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Supplier (opsional)</div>
          <select id="bahan-supplier" name="bahanSupplier" style={input} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">-- tanpa supplier --</option>
            {(suppliers || []).map((s) => (
              <option key={s.id} value={s.id}>{s.nama}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: list.length ? 10 : 0 }}>
        <button style={btnPrimary} onClick={submit}>{editing ? "Simpan Perubahan" : "+ Tambah Bahan"}</button>
        {editing && <button style={btnGhost} onClick={reset}>Batal</button>}
      </div>

      {list.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <input
            id="bahan-search"
            name="bahanSearch"
            style={input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama bahan baku..."
            aria-label="Cari bahan baku"
          />
        </div>
      )}

      {q && filtered.length === 0 && (
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, padding: "4px 0" }}>
          Tidak ada bahan cocok dengan "{search.trim()}".
        </div>
      )}

      {visible.map((b) => {
        const low = Number(b.stok) <= Number(b.minStok);
        return (
          <div
            key={b.id}
            style={{ ...row, borderTop: `1px solid ${BD}`, padding: "6px 0", alignItems: "center", cursor: "pointer" }}
            onClick={() => setDetail(b)}
            title="Klik untuk lihat detail bahan"
          >
            <div>
              <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
                {b.nama} <span style={{ color: MT, fontWeight: 400 }}>({b.satuan || "-"})</span>
              </div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: low ? COLOR_PALETTE.danger : MT }}>
                Stok {b.stok} / min {b.minStok} &middot; {money(b.hargaSatuan)} &middot; {advancedData.supplierLabel(suppliers, b.supplierId)}
                {low ? "  \u26A0 restock" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
              <button style={btnGhost} onClick={() => editRow(b)}>Edit</button>
              <button style={btnDanger} onClick={() => remove(b)}>Hapus</button>
            </div>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div style={{ marginTop: 8 }}>
          <button style={btnGhost} onClick={() => setShowAll(true)}>
            {collapseLabel} ({hiddenCount} lainnya)
          </button>
        </div>
      )}

      {showAll && (
        <BahanListModal
          list={filtered}
          search={search}
          onSearch={setSearch}
          onPick={(b) => setDetail(b)}
          onEdit={editRow}
          onDelete={remove}
          onClose={() => setShowAll(false)}
        />
      )}

      {detail && (
        <BahanDetailModal
          bahan={detail}
          resep={advancedData.resep}
          menu={menu}
          suppliers={suppliers}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

export default memo(BahanBakuPanel);
