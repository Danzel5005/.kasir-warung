import { memo, useMemo, useRef, useState } from "react";
import { BD, LT, MT, W, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/design.js";
import { isAdvancedFeatureOn } from "../constants/advancedFeatures.js";
import { DEFAULT_LOYALTY_TIERS } from "../utilities/loyalty.js";
import { useExcelImport } from "../hooks/useExcelImport.js";
import { ROW_NEW, ROW_CONFLICT, ROW_ERROR } from "../utilities/excelImport.js";
import BahanDetailModal from "./modals/BahanDetailModal.jsx";
import BahanListModal from "./modals/BahanListModal.jsx";
import MenuListModal from "./modals/MenuListModal.jsx";
import SupplierListModal from "./modals/SupplierListModal.jsx";

// AdvancedDataPanel -- panel pengelolaan fitur lanjutan (Bahan Baku, Supplier,
// Loyalty Tier, Resep/HPP). Setiap sub-panel muncul HANYA bila flag terkait
// aktif (via isAdvancedFeatureOn). Flag key berasal dari advancedFeatures.js.
//
// Props:
//   settings     - objek settings (untuk isAdvancedFeatureOn)
//   advancedData - nilai balik useAdvancedData()
//   menu         - daftar menu (untuk editor resep)
//   toast_       - feedback opsional

const sectionTitle = {
  fontSize: TYPOGRAPHY.body.fontSize,
  fontWeight: 800,
  color: MT,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  margin: "0 0 6px",
};

const card = {
  background: W,
  border: `1px solid ${BD}`,
  borderRadius: RADIUS.md,
  padding: "10px 12px",
  marginBottom: 10,
};

const label = { fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 2 };
const input = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${BD}`,
  borderRadius: RADIUS.sm,
  padding: "6px 8px",
  fontSize: TYPOGRAPHY.small.fontSize,
  fontFamily: "inherit",
  background: W,
};
const btnPrimary = {
  background: COLOR_PALETTE.primary,
  color: W,
  border: "none",
  borderRadius: RADIUS.sm,
  padding: "6px 12px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: TYPOGRAPHY.small.fontSize,
  fontWeight: 700,
};
const btnGhost = {
  background: COLOR_PALETTE.infoLight,
  color: COLOR_PALETTE.info,
  border: "none",
  borderRadius: RADIUS.sm,
  padding: "5px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: TYPOGRAPHY.label.fontSize,
  fontWeight: 600,
};
const btnDanger = {
  background: COLOR_PALETTE.dangerLight,
  color: COLOR_PALETTE.danger,
  border: "none",
  borderRadius: RADIUS.sm,
  padding: "5px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: TYPOGRAPHY.label.fontSize,
  fontWeight: 600,
};

function money(n) {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID");
}

// Batas jumlah bahan yang tampil di daftar ringkas Bahan Baku. Bila daftar
// (hasil filter) lebih banyak dari ini, sisanya disembunyikan dan muncul
// tombol "Lihat semua bahan" yang membuka modal daftar lengkap.
const BAHAN_COLLAPSE_LIMIT = 5;

// Batas jumlah supplier yang tampil di daftar ringkas Supplier. Sisa supplier
// dibuka di SupplierListModal (pola sama dengan Bahan Baku).
const SUPPLIER_COLLAPSE_LIMIT = 5;

// Batas jumlah menu yang tampil pada dropdown search bar Resep & HPP. Bila
// daftar menu lebih banyak, sisa menu dibuka lewat tombol "Lihat semua menu"
// (MenuListModal) — bukan lagi daftar "menu terbaru".
const RESEP_MENU_LIMIT = 10;

// ---------------------------------------------------------------------------
// Bahan Baku
// ---------------------------------------------------------------------------
function BahanBakuPanel({ advancedData, toast_, suppliers, menu }) {
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

  const editRow = (b) =>
    setForm({
      id: b.id,
      nama: b.nama,
      satuan: b.satuan,
      stok: String(b.stok),
      minStok: String(b.minStok),
      hargaSatuan: String(b.hargaSatuan),
      supplierId: b.supplierId || "",
    });

  const remove = async (b) => {
    advancedData.deleteBahan(b.id);
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
    <div style={card}>
      <div style={{ ...sectionTitle, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span>Bahan Baku ({list.length})</span>
        {q && (
          <span style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 600, color: MT, textTransform: "none", letterSpacing: 0 }}>
            {filtered.length} hasil
          </span>
        )}
      </div>

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

// ---------------------------------------------------------------------------
// Loyalty Tier
// ---------------------------------------------------------------------------
function LoyaltyPanel({ advancedData, toast_ }) {
  const tiers = advancedData.loyaltyTiers || DEFAULT_LOYALTY_TIERS;
  const [draft, setDraft] = useState(() => tiers.map((t) => ({ ...t })));

  const change = (idx, field, value) =>
    setDraft((d) => d.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));

  const save = async () => {
    const norm = draft
      .map((t) => ({
        key: String(t.key || "").trim(),
        label: String(t.label || "").trim() || String(t.key || "").trim(),
        min: Number(t.min) || 0,
        discountPct: Math.max(0, Math.min(100, Number(t.discountPct) || 0)),
      }))
      .filter((t) => t.key);
    advancedData.setLoyaltyTiers(norm);
    await advancedData.saveLoyaltyTiers(norm);
    toast_?.("Loyalty tier disimpan", "ok");
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Loyalty Tier ({draft.length})</div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 8 }}>
        Tentukan ambang total belanja (Rp) dan diskon (%) per tingkatan.
      </div>

      {draft.map((t, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 8, marginBottom: 6 }}>
          <div>
            <div style={label}>Label</div>
            <input id={`loyalty-label-${i}`} name={`loyaltyLabel_${i}`} style={input} value={t.label} onChange={(e) => change(i, "label", e.target.value)} placeholder="Bronze" />
          </div>
          <div>
            <div style={label}>Min. total (Rp)</div>
            <input id={`loyalty-min-${i}`} name={`loyaltyMin_${i}`} style={input} type="number" value={t.min} onChange={(e) => change(i, "min", e.target.value)} />
          </div>
          <div>
            <div style={label}>Diskon (%)</div>
            <input id={`loyalty-discount-${i}`} name={`loyaltyDiscount_${i}`} style={input} type="number" value={t.discountPct} onChange={(e) => change(i, "discountPct", e.target.value)} />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button style={btnPrimary} onClick={save}>Simpan Tier</button>
        <button
          style={btnGhost}
          onClick={() => setDraft(DEFAULT_LOYALTY_TIERS.map((t) => ({ ...t })))}
        >
          Reset Default
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resep / HPP per menu
// ---------------------------------------------------------------------------

// Dropdown bahan baku dengan search bar. Dipakai pada tiap baris resep supaya
// user bisa mencari nama bahan (bukan scroll <select> panjang). Menampilkan
// label terpilih saat fokus, dan daftar saran yang disaring saat mengetik.
function BahanSearchSelect({ value, bahanList, onChange, id, name }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const selected = (bahanList || []).find((b) => b.id === value) || null;
  const display = open ? text : selected ? `${selected.nama} (${selected.satuan || "-"})` : "";

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return bahanList || [];
    return (bahanList || []).filter((b) => String(b.nama || "").toLowerCase().includes(q));
  }, [bahanList, text]);

  const choose = (b) => {
    onChange(b.id);
    setText("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        style={input}
        value={display}
        autoComplete="off"
        placeholder="Cari nama bahan..."
        onFocus={() => {
          setOpen(true);
          setText("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 30,
            background: W,
            border: `1px solid ${BD}`,
            borderRadius: RADIUS.sm,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          }}
        >
          {filtered.map((b) => (
            <div
              key={b.id}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(b);
              }}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: TYPOGRAPHY.small.fontSize,
                borderBottom: `1px solid ${LT}`,
                background: b.id === value ? LT : W,
              }}
            >
              {b.nama} <span style={{ color: MT }}>({b.satuan || "-"})</span>
              {b.id === value ? " \u2713" : ""}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "6px 10px", fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
              Tidak ada bahan cocok.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResepPanel({ advancedData, menu, toast_ }) {
  const [activeMenu, setActiveMenu] = useState("");
  const [query, setQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const bahanList = advancedData.bahanBaku;

  const lines = activeMenu ? advancedData.resep[activeMenu] || [] : [];
  const hpp = activeMenu ? advancedData.hppByMenu[activeMenu] || null : null;
  const menuObj = useMemo(() => (menu || []).find((m) => m.id === activeMenu), [menu, activeMenu]);
  const margin = menuObj ? advancedData.marginFor(activeMenu, menuObj.harga) : null;

  // Filter menu berdasarkan kata kunci (nama menu). Dipakai untuk search bar
  // di atas daftar menu supaya pencarian resep lebih cepat saat menu banyak.
  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menu || [];
    return (menu || []).filter((m) => String(m.nama || "").toLowerCase().includes(q));
  }, [menu, query]);

  const hasQuery = query.trim().length > 0;

  // Dropdown menampilkan maks RESEP_MENU_LIMIT (10) menu pertama, baik saat
  // ada ketikan (hasil filter) maupun kosong (10 menu pertama dari daftar).
  const visibleSuggest = showSuggest ? filteredMenu.slice(0, RESEP_MENU_LIMIT) : [];
  const hiddenMenuCount = showAll ? 0 : Math.max(0, filteredMenu.length - RESEP_MENU_LIMIT);

  const pickMenu = (id) => {
    setActiveMenu(id);
    setShowSuggest(false);
    const m = (menu || []).find((x) => x.id === id);
    if (m) {
      setQuery(m.nama);
    }
  };

  const setLines = async (next) => {
    advancedData.setMenuResep(activeMenu, next);
  };

  const addLine = async () => {
    if (!bahanList.length) {
      toast_?.("Tambahkan bahan baku dulu", "err");
      return;
    }
    const firstId = bahanList[0].id;
    await setLines([...lines, { bahanId: firstId, qty: 1 }]);
  };

  const updateLine = async (idx, field, value) => {
    const next = lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l));
    await setLines(next);
  };

  const removeLine = async (idx) => {
    await setLines(lines.filter((_, i) => i !== idx));
  };

  // Simpan resep menu aktif lalu kosongkan form supaya user bisa langsung
  // menyusun resep untuk item menu berikutnya. Simpan DILARANG bila ada baris
  // yang belum lengkap: bahan belum dipilih atau qty kosong/0.
  const saveMenu = async () => {
    if (!activeMenu) return;
    if (lines.length === 0) {
      toast_?.("Resep masih kosong", "err");
      return;
    }
    // Cari baris bermasalah (qty 0/kosong, atau bahan belum dipilih).
    const badIdx = lines.findIndex((l) => !l.bahanId || !(Number(l.qty) > 0));
    if (badIdx !== -1) {
      const bad = lines[badIdx];
      const namaBahan = (bahanList.find((b) => b.id === bad.bahanId) || {}).nama;
      toast_?.(
        namaBahan
          ? `Jumlah bahan "${namaBahan}" harus lebih dari 0`
          : `Baris ${badIdx + 1}: pilih bahan dan isi jumlah lebih dari 0`,
        "err"
      );
      return;
    }
    advancedData.setMenuResep(activeMenu, lines);
    toast_?.(`Resep "${menuObj?.nama || ""}" disimpan`, "ok");
    // Kosongkan form untuk resep menu berikutnya.
    setActiveMenu("");
    setQuery("");
    setShowSuggest(false);
  };

  return (
    <div style={card}>
      <div style={sectionTitle}>Resep &amp; HPP</div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 8 }}>
        Susun resep per menu dari bahan baku; HPP &amp; margin dihitung otomatis.
      </div>

      <div style={{ ...label }}>Pilih menu</div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input
          id="resep-menu-search"
          name="resepMenuSearch"
          style={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggest(true);
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
          placeholder="Cari nama menu..."
          aria-label="Cari nama menu"
          aria-autocomplete="list"
        />
        {visibleSuggest.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: W,
              border: `1px solid ${BD}`,
              borderRadius: RADIUS.sm,
              marginTop: 2,
              maxHeight: 200,
              overflowY: "auto",
              boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
            }}
          >
            {visibleSuggest.map((m) => (
              <div
                key={m.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMenu(m.id);
                }}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: TYPOGRAPHY.small.fontSize,
                  borderBottom: `1px solid ${LT}`,
                }}
                title="Klik untuk menyusun resep menu ini"
              >
                {m.nama}
                {menuObj && m.id === activeMenu ? " \u2713" : ""}
              </div>
            ))}
            {hiddenMenuCount > 0 && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowAll(true);
                  setShowSuggest(false);
                }}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: TYPOGRAPHY.label.fontSize,
                  fontWeight: 700,
                  color: COLOR_PALETTE.info,
                  background: COLOR_PALETTE.infoLight,
                }}
                title="Lihat semua menu"
              >
                Lihat semua menu ({hiddenMenuCount} lainnya)
              </div>
            )}
          </div>
        )}
        {showSuggest && visibleSuggest.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: W,
              border: `1px solid ${BD}`,
              borderRadius: RADIUS.sm,
              marginTop: 2,
              padding: "6px 10px",
              fontSize: TYPOGRAPHY.label.fontSize,
              color: MT,
            }}
          >
            {hasQuery ? "Tidak ada menu cocok." : "Ketik untuk mencari menu."}
          </div>
        )}
      </div>

      {!showAll && hiddenMenuCount > 0 && (
        <div style={{ marginBottom: 8 }}>
          <button style={btnGhost} onClick={() => setShowAll(true)}>
            Lihat semua menu ({hiddenMenuCount} lainnya)
          </button>
        </div>
      )}

      {showAll && (
        <MenuListModal
          list={filteredMenu}
          search={query}
          onSearch={(v) => setQuery(v)}
          onPick={(m) => {
            pickMenu(m.id);
            setShowAll(false);
          }}
          onClose={() => setShowAll(false)}
        />
      )}

      {!activeMenu && (
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
          Pilih menu untuk mulai menyusun resep.
        </div>
      )}

      {activeMenu && (
        <>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr auto",
                gap: 8,
                marginBottom: 6,
                padding: 4,
                borderRadius: RADIUS.sm,
                border: !(Number(l.qty) > 0)
                  ? `1px solid ${COLOR_PALETTE.danger}`
                  : "1px solid transparent",
                background: !(Number(l.qty) > 0) ? COLOR_PALETTE.dangerLight : "transparent",
              }}
              title={!(Number(l.qty) > 0) ? "Isi jumlah bahan lebih dari 0" : ""}
            >
              <BahanSearchSelect
                id={`resep-bahan-${i}`}
                name={`resepBahan_${i}`}
                value={l.bahanId}
                bahanList={bahanList}
                onChange={(id) => updateLine(i, "bahanId", id)}
              />
              <input
                id={`resep-qty-${i}`}
                name={`resepQty_${i}`}
                style={input}
                type="number"
                step="any"
                value={l.qty}
                onChange={(e) => updateLine(i, "qty", e.target.value)}
                placeholder="qty"
              />
              <button style={btnDanger} onClick={() => removeLine(i)}>Hapus</button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button style={btnGhost} onClick={addLine}>+ Baris Bahan</button>
            <button style={btnPrimary} onClick={saveMenu}>Simpan</button>
            {lines.length > 0 && (
              <button
                style={btnDanger}
                onClick={async () => {
                  advancedData.clearMenuResep(activeMenu);
                  toast_?.("Resep dikosongkan", "ok");
                  setActiveMenu("");
                  setQuery("");
                  setShowSuggest(false);
                }}
              >
                Kosongkan Resep
              </button>
            )}
          </div>

          <div style={{ background: LT, borderRadius: RADIUS.sm, padding: "8px 10px" }}>
            <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
              HPP: {hpp ? money(hpp.hpp) : "-"}
              {hpp && hpp.missing && hpp.missing.length > 0
                ? `  \u26A0 ${hpp.missing.length} bahan tak dikenal`
                : ""}
            </div>
            {menuObj && (
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 2 }}>
                Harga jual {money(menuObj.harga)}
                {margin
                  ? ` \u00B7 Laba ${money(margin.profit)} \u00B7 Margin ${(Number(margin.marginPct) * 100).toFixed(1)}%`
                  : ""}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root panel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Import Excel (Menu / BahanBaku / Resep)
// ---------------------------------------------------------------------------
// Impor massal dari template .xlsx. Panel ini TIDAK bergantung pada flag fitur
// advanced (bahan baku/resep) karena import bisa saja hanya berisi sheet Menu.
// Preview ditampilkan inline (tanpa modal bertingkat). Kebijakan:
//   - Kategori tak dikenal -> otomatis dibuat (bukan error baris).
//   - Stok menu existing TIDAK ditimpa; hanya stok menu baru yang dipakai.
//   - Menu yang punya resep -> field modal diabaikan (resep sumber kebenaran).
const statusColor = {
  [ROW_NEW]: { bg: COLOR_PALETTE.primaryLight, fg: COLOR_PALETTE.primary },
  [ROW_CONFLICT]: { bg: "#fff6e5", fg: "#b7791f" },
  [ROW_ERROR]: { bg: COLOR_PALETTE.dangerLight, fg: COLOR_PALETTE.danger },
};

function ImportExcelPanel({ menu, cats, advancedData, toast_, onImported }) {
  const imp = useExcelImport({ menu, cats, advancedData, toast_, onImported });
  const fileRef = useRef(null);

  const plan = imp.validated?.plan;
  const vMenu = imp.validated?.vMenu;
  const vBahan = imp.validated?.vBahan;
  const vResep = imp.validated?.vResep;

  const pickFile = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // agar memilih file sama lagi tetap terpicu
    await imp.loadFile(file);
  };

  const conflictRows = (rows) => (rows || []).filter((r) => r.status === ROW_CONFLICT);
  const errorRows = (rows) => (rows || []).filter((r) => r.status === ROW_ERROR);

  const renderDecisionRow = (kind, r) => {
    const chosen = imp.decisions[kind]?.[r.index];
    const label = kind === "menu"
      ? `${r.data.nama}  ·  ${money(r.data.harga)}`
      : `Bahan: ${r.existing?.nama || r.data.nama || r.data.id}`;
    return (
      <div key={r.index} style={{ ...row, gap: 8, padding: "4px 0", borderBottom: `1px solid ${BD}` }}>
        <div style={{ flex: 1, fontSize: TYPOGRAPHY.label.fontSize }}>
          {label}
          <div style={{ color: MT, fontSize: TYPOGRAPHY.label.fontSize }}>
            existing: {kind === "menu" ? money(r.existing?.harga) : `${r.existing?.stok ?? 0} ${r.existing?.satuan || ""}`}
          </div>
        </div>
        <button
          style={chosen === "keep" ? btnPrimary : btnGhost}
          onClick={() => imp.setRowDecision(kind, r.index, "keep")}
        >
          Simpan lama
        </button>
        <button
          style={chosen === "overwrite" ? btnPrimary : btnGhost}
          onClick={() => imp.setRowDecision(kind, r.index, "overwrite")}
        >
          Timpa
        </button>
      </div>
    );
  };

  const menuConf = conflictRows(vMenu?.rows);
  const bahanConf = conflictRows(vBahan?.rows);
  const menuErr = errorRows(vMenu?.rows);
  const bahanErr = errorRows(vBahan?.rows);
  const resepErr = errorRows(vResep?.rows);

  return (
    <div style={card}>
      <div style={sectionTitle}>Import dari Excel</div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 8 }}>
        Unggah file .xlsx dengan sheet <b>Menu</b>, <b>BahanBaku</b>, dan/atau <b>Resep</b>.
        Kategori baru otomatis dibuat. Stok menu yang sudah ada tidak ditimpa.
      </div>

      <input
        id="excel-import-file"
        name="excelImportFile"
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <div style={{ ...row, gap: 8, marginBottom: 8 }}>
        <button style={btnPrimary} onClick={pickFile} disabled={imp.step === "committing"}>
          {imp.step === "idle" ? "Pilih File Excel" : "Pilih File Lain"}
        </button>
        {imp.fileName && (
          <span style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>{imp.fileName}</span>
        )}
        {imp.step !== "idle" && (
          <button style={btnGhost} onClick={imp.reset}>Reset</button>
        )}
      </div>

      {imp.error && (
        <div style={{ ...card, background: COLOR_PALETTE.dangerLight, border: "none", color: COLOR_PALETTE.danger, marginBottom: 8 }}>
          {imp.error}
        </div>
      )}

      {(imp.step === "preview" || imp.step === "committing") && plan && (
        <div>
          <div style={{ ...row, gap: 12, flexWrap: "wrap", fontSize: TYPOGRAPHY.label.fontSize, marginBottom: 8 }}>
            <b>Ringkasan:</b>
            <span>Menu baru {plan.stats.menuNew}</span>
            <span>· Konflik menu {plan.stats.menuConflict}</span>
            <span>· Bahan baru {plan.stats.bahanNew}</span>
            <span>· Konflik bahan {plan.stats.bahanConflict}</span>
            <span>· Resep {plan.stats.resepOk}</span>
            {plan.stats.menusWithResep > 0 && <span>· {plan.stats.menusWithResep} menu pakai resep</span>}
            {plan.newCategories.length > 0 && <span>· {plan.newCategories.length} kategori baru</span>}
          </div>

          {plan.stats.menusWithResep > 0 && (
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 6 }}>
              Catatan: menu dengan resep di file — modal dari Excel diabaikan (HPP dihitung dari resep).
            </div>
          )}

          {menuConf.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...row, justifyContent: "space-between" }}>
                <div style={label}>Konflik Menu ({menuConf.length})</div>
                <div style={{ ...row, gap: 6 }}>
                  <button style={btnGhost} onClick={() => imp.setAllDecisions("menu", "keep")}>Semua: Simpan lama</button>
                  <button style={btnGhost} onClick={() => imp.setAllDecisions("menu", "overwrite")}>Semua: Timpa</button>
                </div>
              </div>
              {menuConf.map((r) => renderDecisionRow("menu", r))}
            </div>
          )}

          {bahanConf.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...row, justifyContent: "space-between" }}>
                <div style={label}>Konflik Bahan ({bahanConf.length})</div>
                <div style={{ ...row, gap: 6 }}>
                  <button style={btnGhost} onClick={() => imp.setAllDecisions("bahan", "keep")}>Semua: Simpan lama</button>
                  <button style={btnGhost} onClick={() => imp.setAllDecisions("bahan", "overwrite")}>Semua: Timpa</button>
                </div>
              </div>
              {bahanConf.map((r) => renderDecisionRow("bahan", r))}
            </div>
          )}

          {(menuErr.length > 0 || bahanErr.length > 0 || resepErr.length > 0) && (
            <div style={{ marginBottom: 8 }}>
              <div style={label}>Baris dilewati (tidak bisa diproses)</div>
              {[
                ...menuErr.map((r) => ({ ...r, sheet: "Menu" })),
                ...bahanErr.map((r) => ({ ...r, sheet: "BahanBaku" })),
                ...resepErr.map((r) => ({ ...r, sheet: "Resep" })),
              ].map((r) => (
                <div key={`${r.sheet}-${r.index}`} style={{ fontSize: TYPOGRAPHY.label.fontSize, color: COLOR_PALETTE.danger }}>
                  [{r.sheet} baris {r.index + 2}] {r.errors.join("; ")}
                </div>
              ))}
            </div>
          )}

          <button
            style={{ ...btnPrimary, opacity: plan.hasPendingDecisions ? 0.5 : 1 }}
            onClick={() => imp.commit()}
            disabled={plan.hasPendingDecisions || imp.step === "committing"}
          >
            {imp.step === "committing"
              ? "Menyimpan..."
              : plan.hasPendingDecisions
              ? `Pilih keputusan untuk ${plan.pendingCount} baris konflik`
              : "Terapkan Import"}
          </button>
        </div>
      )}

      {imp.step === "done" && imp.result && (
        <div style={{ ...card, background: COLOR_PALETTE.primaryLight, border: "none", marginBottom: 0 }}>
          <b>Import selesai.</b> Menu: {imp.result.menu} · Bahan: {imp.result.bahan} · Resep (menu): {imp.result.resepMenu} · Kategori baru: {imp.result.kategori}
        </div>
      )}
    </div>
  );
}

function AdvancedDataPanel({ settings, advancedData, menu, cats, toast_, onImported }) {
  const showBahan = isAdvancedFeatureOn(settings, "bahanBaku");
  const showSupplier = isAdvancedFeatureOn(settings, "supplier");
  const showLoyalty = isAdvancedFeatureOn(settings, "loyalty");
  const showResep = isAdvancedFeatureOn(settings, "resepHpp");

  if (!advancedData) return null;

  return (
    <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
      <ImportExcelPanel menu={menu} cats={cats} advancedData={advancedData} toast_={toast_} onImported={onImported} />
      {showResep && <ResepPanel advancedData={advancedData} menu={menu} toast_={toast_} />}
      {showBahan && (
        <BahanBakuPanel advancedData={advancedData} toast_={toast_} suppliers={advancedData.supplier} menu={menu} />
      )}
      {showSupplier && <SupplierPanel advancedData={advancedData} toast_={toast_} />}
      {showLoyalty && <LoyaltyPanel advancedData={advancedData} toast_={toast_} />}
    </div>
  );
}

export default memo(AdvancedDataPanel);
