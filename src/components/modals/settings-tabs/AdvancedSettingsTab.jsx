import { G, W, LT, BD, MT, TX, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../../constants/design.js";
import { ADVANCED_FEATURE_GROUPS, DEFAULT_ADVANCED_FEATURES } from "../../../constants/advancedFeatures.js";

// ToggleSwitch — saklar gaya iOS minimal, tanpa dependensi. Dipakai untuk
// saklar induk maupun tiap sub-fitur supaya tidak ada dua gaya kontrol.
function ToggleSwitch({ checked, onChange, disabled }) {
  const width = 38;
  const height = 20;
  const knob = 16;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width,
        height,
        borderRadius: height / 2,
        border: "none",
        padding: 2,
        background: disabled ? "#d8d8d0" : checked ? G : "#c9c9c1",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      <span style={{ width: knob, height: knob, borderRadius: "50%", background: W, boxShadow: "0 1px 2px rgba(0,0,0,0.25)", transition: "all 0.15s" }} />
    </button>
  );
}

export function AdvancedSettingsTab({ settingsH }) {
  const adv = settingsH.settings.advancedFeatures || DEFAULT_ADVANCED_FEATURES;
  const masterOn = !!adv.enabled;

  return <div>
    <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, fontWeight: 600, marginBottom: 10 }}>
      Fitur tingkat lanjut bersifat opsional. Nyalakan hanya yang Anda butuhkan — semuanya mati secara default.
    </div>

    {/* Saklar induk */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: masterOn ? COLOR_PALETTE.primaryLight : LT, border: `1px solid ${masterOn ? "#a8d5b8" : BD}`, borderRadius: RADIUS.md, marginBottom: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: masterOn ? G : TX }}>Nyalakan Fitur Tingkat Lanjut</div>
        <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 3 }}>
          {masterOn ? "Saklar induk aktif — pilih fitur di bawah." : "Saklar induk mati — semua fitur lanjutan disembunyikan."}
        </div>
      </div>
      <ToggleSwitch checked={masterOn} onChange={(v) => settingsH.setAdvancedEnabled(v)} />
    </div>

    {/* Daftar sub-fitur per fase */}
    <div style={{ opacity: masterOn ? 1 : 0.45, transition: "opacity 0.15s" }}>
      {ADVANCED_FEATURE_GROUPS.map((group) => (
        <div key={group.fase} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: TYPOGRAPHY.label.fontSize, fontWeight: 700, color: G, marginBottom: 7 }}>{group.fase}</div>
          <div style={{ display: "grid", gap: 7 }}>
            {group.items.map((item) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: W, border: `1px solid ${BD}`, borderRadius: RADIUS.md }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700, color: TX }}>{item.label}</div>
                  <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginTop: 2 }}>{item.desc}</div>
                </div>
                <ToggleSwitch
                  checked={!!adv[item.key]}
                  disabled={!masterOn}
                  onChange={(v) => settingsH.toggleAdvancedFeature(item.key, v)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>;
}
