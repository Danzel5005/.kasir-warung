import { memo, useMemo, useState } from "react";
import { BD, LT, MT, W, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import MenuListModal from "../modals/MenuListModal.jsx";
import { BahanSearchSelect } from "./BahanSearch.jsx";
import { sectionTitle, card, label, input, btnPrimary, btnGhost, btnDanger, money } from "./PanelStyles.js";

const RESEP_MENU_LIMIT = 10;

// ---------------------------------------------------------------------------
// Resep / HPP per menu
// ---------------------------------------------------------------------------
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

export default memo(ResepPanel);
