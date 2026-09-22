import { memo } from "react";
import { G, W, LT, BD, MT, TX, RADIUS, TYPOGRAPHY } from "../constants/design.js";
import AdvancedDataPanel from "../components/AdvancedDataPanel.jsx";
import { ADVANCED_FEATURE_GROUPS, DEFAULT_ADVANCED_FEATURES } from "../constants/advancedFeatures.js";

// ViewFiturLanjutan — halaman terpisah untuk seluruh fitur tingkat lanjut
// (import Excel menu/bahan/resep, bahan baku, supplier, loyalty tier, resep &
// HPP). Laporan tambahan (insight penjualan, ekspor PDF, cash flow) SENGAJA
// tetap tinggal di halaman Laporan.
//
// Halaman ini hanya dirender App.jsx saat saklar induk "Nyalakan Fitur Tingkat
// Lanjut" AKTIF — jadi ikut hilang/muncul bersama tombolnya.
//
// Props:
//   menu         - daftar menu (untuk editor resep & import)
//   cats         - daftar kategori (untuk import)
//   advancedData - nilai balik useAdvancedData()
//   settings     - objek settings (untuk isAdvancedFeatureOn)
//   toast_       - feedback opsional
function ViewFiturLanjutan({ menu, cats, advancedData, settings, toast_ }) {
  const adv = settings?.advancedFeatures || DEFAULT_ADVANCED_FEATURES;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header halaman */}
      <div style={{ padding: "9px 16px", background: W, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
        <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>Fitur Tingkat Lanjut</div>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 2 }}>
          Bahan baku, supplier, resep &amp; HPP, loyalty tier, dan impor Excel.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
        {/* Ringkasan fitur yang sedang aktif */}
        <div style={{ padding: "10px 16px 0" }}>
          <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: RADIUS.md, padding: "10px 12px" }}>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: TX, marginBottom: 6 }}>
              Ringkasan status
            </div>
            {ADVANCED_FEATURE_GROUPS.map((group) => (
              <div key={group.fase} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600 }}>{group.fase}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
                  {group.items.map((item) => {
                    const on = !!adv[item.key];
                    return (
                      <span
                        key={item.key}
                        title={item.desc}
                        style={{
                          fontSize: TYPOGRAPHY.label.fontSize,
                          padding: "2px 8px",
                          borderRadius: RADIUS.sm,
                          background: on ? "#e8f5ee" : COLORS.off,
                          color: on ? G : MT,
                          border: `1px solid ${on ? "#a8d5b8" : BD}`,
                          fontWeight: 600,
                        }}
                      >
                        {on ? "\u2713" : "\u2013"} {item.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 6 }}>
              Catatan: laporan tambahan (Insight Penjualan, Ekspor PDF, Cash Flow) tetap ada di halaman Laporan.
              Fitur yang belum dinyalakan disembunyikan dari daftar di bawah.
            </div>
          </div>
        </div>

        <AdvancedDataPanel settings={settings} advancedData={advancedData} menu={menu} cats={cats} toast_={toast_} />
      </div>
    </div>
  );
}

const COLORS = { off: "#f4f4f0" };

export default memo(ViewFiturLanjutan);
