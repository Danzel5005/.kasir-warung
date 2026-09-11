import { useState } from "react";
import { G, W, BD, row, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";
import { ADDITIONALS } from "../../constants/additionals.js";

export default function AdditionalsModal({ item, isOpen, onClose, onConfirm, cats }) {
  const [selections, setSelections] = useState({});

  // Cari kategori item untuk cek apakah punya tag "drinks"
  const itemCat = cats.find(c => c.key === item?.kategori);
  const hasDrinksTag = itemCat?.tags?.includes("drinks");

  if (!isOpen || !item || !hasDrinksTag) return null;

  const additionalConfig = ADDITIONALS.drinks;

  const handleSelect = (optionKey, choiceKey) => {
    setSelections(prev => ({ ...prev, [optionKey]: choiceKey }));
  };

  const handleSubSelect = (optionKey, subOptionKey) => {
    // For ice/hot, store both the main choice and sub-option
    setSelections(prev => ({ ...prev, [`${optionKey}_sub`]: subOptionKey }));
  };

  const handleConfirm = () => {
    // Create additionals object from selections
    const additionals = {};
    Object.entries(selections).forEach(([key, value]) => {
      if (!key.includes("_sub")) {
        additionals[key] = value;
      }
    });
    
    // Add sub-option for ice if selected
    if (selections.temperature === "ice" && selections.temperature_sub) {
      additionals.ice_level = selections.temperature_sub;
    }

    onConfirm(additionals);
    setSelections({});
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 350,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: W,
        borderRadius: RADIUS.lg,
        padding: "20px",
        width: 420,
        maxWidth: "95vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh",
      }}>

        {/* Header */}
        <div style={{ ...row, marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: TYPOGRAPHY.body.fontSize, fontWeight: 700, color: G }}>
              {item.nama}
            </span>
            <div style={{ fontSize: TYPOGRAPHY.label.fontSize, color: "#888", marginTop: 2 }}>
              Pilih opsi tambahan
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${BD}`,
              borderRadius: RADIUS.sm,
              width: 24,
              height: 24,
              cursor: "pointer",
              fontSize: TYPOGRAPHY.small.fontSize,
              flexShrink: 0,
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Additionals Options */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: 14 }}>
          {additionalConfig.options.map(option => (
            <div key={option.key} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${COLOR_PALETTE.primaryLight}` }}>
              <div style={{ fontSize: TYPOGRAPHY.small.fontSize, fontWeight: 700, color: G, marginBottom: 8 }}>
                {option.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {option.choices.map(choice => (
                  <div key={choice.key}>
                    <button
                      onClick={() => handleSelect(option.key, choice.key)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        textAlign: "left",
                        border: `1px solid ${selections[option.key] === choice.key ? COLOR_PALETTE.success : BD}`,
                        background: selections[option.key] === choice.key ? COLOR_PALETTE.successLight : W,
                        borderRadius: RADIUS.md,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: TYPOGRAPHY.small.fontSize,
                        fontWeight: selections[option.key] === choice.key ? 600 : 400,
                        color: selections[option.key] === choice.key ? COLOR_PALETTE.success : "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {choice.label}
                    </button>

                    {/* Sub-options for Ice */}
                    {choice.key === "ice" && selections[option.key] === "ice" && choice.subOptions?.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, marginLeft: 12 }}>
                        {choice.subOptions.map(sub => (
                          <button
                            key={sub.key}
                            onClick={() => handleSubSelect(option.key, sub.key)}
                            style={{
                              padding: "6px 10px",
                              textAlign: "left",
                              border: `1px solid ${selections[`${option.key}_sub`] === sub.key ? COLOR_PALETTE.info : BD}`,
                              background: selections[`${option.key}_sub`] === sub.key ? COLOR_PALETTE.infoLight : "#f9faf9",
                              borderRadius: RADIUS.sm,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: TYPOGRAPHY.label.fontSize,
                              fontWeight: selections[`${option.key}_sub`] === sub.key ? 600 : 400,
                              color: selections[`${option.key}_sub`] === sub.key ? COLOR_PALETTE.info : "inherit",
                              transition: "all 0.15s",
                            }}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: "#f0f0f0",
              color: "#666",
              border: "none",
              borderRadius: RADIUS.md,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: 600,
            }}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "10px 12px",
              background: G,
              color: W,
              border: "none",
              borderRadius: RADIUS.md,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: TYPOGRAPHY.small.fontSize,
              fontWeight: 700,
            }}
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
