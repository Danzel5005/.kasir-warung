import { memo, useMemo, useState } from "react";
import { BD, LT, MT, W, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../constants/design.js";
import { isAdvancedFeatureOn } from "../constants/advancedFeatures.js";
import { DEFAULT_LOYALTY_TIERS } from "../utilities/loyalty.js";

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

// ---------------------------------------------------------------------------
// Bahan Baku
// ---------------------------------------------------------------------------
function BahanBakuPanel({ advancedData, toast_, suppliers }) {
  const [form, setForm] = useState({ id: "", nama: "", satuan: "", stok: "", minStok: "", hargaSatuan: "", supplierId: "" });
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

  const list = advancedData.bahanBaku;

  return (
    <div style={card}>
      <div style={sectionTitle}>Bahan Baku ({list.length})</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={label}>Nama bahan</div>
          <input style={input} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth: Biji Kopi Arabika" />
        </div>
        <div>
          <div style={label}>Satuan</div>
          <input style={input} value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="gram / ml / pcs" />
        </div>
        <div>
          <div style={label}>Stok</div>
          <input style={input} type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Min. stok (peringatan)</div>
          <input style={input} type="number" value={form.minStok} onChange={(e) => setForm({ ...form, minStok: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Harga / satuan</div>
          <input style={input} type="number" value={form.hargaSatuan} onChange={(e) => setForm({ ...form, hargaSatuan: e.target.value })} placeholder="0" />
        </div>
        <div>
          <div style={label}>Supplier (opsional)</div>
          <select style={input} value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
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

      {list.map((b) => {
        const low = Number(b.stok) <= Number(b.minStok);
        return (
          <div key={b.id} style={{ ...row, borderTop: `1px solid ${BD}`, padding: "6px 0", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700 }}>
                {b.nama} <span style={{ color: MT, fontWeight: 400 }}>({b.satuan || "-"})</span>
              </div>
              <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: low ? COLOR_PALETTE.danger : MT }}>
                Stok {b.stok} / min {b.minStok} &middot; {money(b.hargaSatuan)} &middot; {advancedData.supplierLabel(suppliers, b.supplierId)}
                {low ? "  \u26A0 restock" : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <button style={btnGhost} onClick={() => editRow(b)}>Edit</button>
              <button style={btnDanger} onClick={() => remove(b)}>Hapus</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------
function SupplierPanel({ advancedData, toast_ }) {
  const empty = { id: "", nama: "", kontak: "", telepon: "", alamat: "", catatan: "" };
  const [form, setForm] = useState(empty);
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

  const list = advancedData.supplier;

  return (
    <div style={card}>
      <div style={sectionTitle}>Supplier ({list.length})</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={label}>Nama supplier</div>
          <input style={input} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth: CV Kopi Nusantara" />
        </div>
        <div>
          <div style={label}>Kontak (PIC)</div>
          <input style={input} value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} placeholder="Nama PIC" />
        </div>
        <div>
          <div style={label}>Telepon</div>
          <input style={input} value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })} placeholder="08xx" />
        </div>
        <div>
          <div style={label}>Alamat</div>
          <input style={input} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} placeholder="Kota / alamat" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: list.length ? 10 : 0 }}>
        <button style={btnPrimary} onClick={submit}>{editing ? "Simpan Perubahan" : "+ Tambah Supplier"}</button>
        {editing && <button style={btnGhost} onClick={reset}>Batal</button>}
      </div>

      {list.map((s) => (
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
            <input style={input} value={t.label} onChange={(e) => change(i, "label", e.target.value)} placeholder="Bronze" />
          </div>
          <div>
            <div style={label}>Min. total (Rp)</div>
            <input style={input} type="number" value={t.min} onChange={(e) => change(i, "min", e.target.value)} />
          </div>
          <div>
            <div style={label}>Diskon (%)</div>
            <input style={input} type="number" value={t.discountPct} onChange={(e) => change(i, "discountPct", e.target.value)} />
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
function ResepPanel({ advancedData, menu, toast_ }) {
  const [activeMenu, setActiveMenu] = useState("");
  const bahanList = advancedData.bahanBaku;

  const lines = activeMenu ? advancedData.resep[activeMenu] || [] : [];
  const hpp = activeMenu ? advancedData.hppByMenu[activeMenu] || null : null;
  const menuObj = useMemo(() => (menu || []).find((m) => m.id === activeMenu), [menu, activeMenu]);
  const margin = menuObj ? advancedData.marginFor(activeMenu, menuObj.harga) : null;

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

  return (
    <div style={card}>
      <div style={sectionTitle}>Resep &amp; HPP</div>
      <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 8 }}>
        Susun resep per menu dari bahan baku; HPP &amp; margin dihitung otomatis.
      </div>

      <div style={{ ...label }}>Pilih menu</div>
      <select style={{ ...input, marginBottom: 8 }} value={activeMenu} onChange={(e) => setActiveMenu(e.target.value)}>
        <option value="">-- pilih menu --</option>
        {(menu || []).map((m) => (
          <option key={m.id} value={m.id}>{m.nama}</option>
        ))}
      </select>

      {!activeMenu && (
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT }}>
          Pilih menu untuk mulai menyusun resep.
        </div>
      )}

      {activeMenu && (
        <>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8, marginBottom: 6 }}>
              <select style={input} value={l.bahanId} onChange={(e) => updateLine(i, "bahanId", e.target.value)}>
                {bahanList.map((b) => (
                  <option key={b.id} value={b.id}>{b.nama} ({b.satuan || "-"})</option>
                ))}
              </select>
              <input
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
            {lines.length > 0 && (
              <button
                style={btnDanger}
                onClick={async () => {
                  advancedData.clearMenuResep(activeMenu);
                  toast_?.("Resep dikosongkan", "ok");
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
function AdvancedDataPanel({ settings, advancedData, menu, toast_ }) {
  const showBahan = isAdvancedFeatureOn(settings, "bahanBaku");
  const showSupplier = isAdvancedFeatureOn(settings, "supplier");
  const showLoyalty = isAdvancedFeatureOn(settings, "loyalty");
  const showResep = isAdvancedFeatureOn(settings, "resepHpp");

  const anyOn = showBahan || showSupplier || showLoyalty || showResep;
  if (!advancedData || !anyOn) return null;

  return (
    <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
      {showResep && <ResepPanel advancedData={advancedData} menu={menu} toast_={toast_} />}
      {showBahan && (
        <BahanBakuPanel advancedData={advancedData} toast_={toast_} suppliers={advancedData.supplier} />
      )}
      {showSupplier && <SupplierPanel advancedData={advancedData} toast_={toast_} />}
      {showLoyalty && <LoyaltyPanel advancedData={advancedData} toast_={toast_} />}
    </div>
  );
}

export default memo(AdvancedDataPanel);
