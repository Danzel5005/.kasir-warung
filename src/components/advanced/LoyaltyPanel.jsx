import { memo, useState } from "react";
import { MT, TYPOGRAPHY } from "../../constants/design.js";
import { DEFAULT_LOYALTY_TIERS } from "../../utilities/loyalty.js";
import { sectionTitle, card, label, input, btnPrimary, btnGhost } from "./PanelStyles.js";

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

export default memo(LoyaltyPanel);
