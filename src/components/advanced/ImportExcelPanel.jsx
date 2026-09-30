import { memo, useRef } from "react";
import { BD, MT, row, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { useExcelImport } from "../../hooks/useExcelImport.js";
import { ROW_NEW, ROW_CONFLICT, ROW_ERROR } from "../../utilities/excelImport.js";
import { sectionTitle, card, label, btnPrimary, btnGhost, money } from "./PanelStyles.js";

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

export default memo(ImportExcelPanel);
