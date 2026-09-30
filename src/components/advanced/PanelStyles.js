import { BD, MT, W, RADIUS, TYPOGRAPHY, COLOR_PALETTE } from "../../constants/design.js";

// PanelStyles — gaya bersama untuk seluruh sub-panel AdvancedDataPanel.
// Dipisah ke modul sendiri supaya tiap komponen di components/advanced/ dapat
// mengimpornya tanpa saling mengimpor komponen lain.
export const sectionTitle = {
  fontSize: TYPOGRAPHY.body.fontSize,
  fontWeight: 800,
  color: MT,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  margin: "0 0 6px",
};

export const card = {
  background: W,
  border: `1px solid ${BD}`,
  borderRadius: RADIUS.md,
  padding: "10px 12px",
  marginBottom: 10,
};

export const label = { fontSize: TYPOGRAPHY.label.fontSize, color: MT, marginBottom: 2 };
export const input = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${BD}`,
  borderRadius: RADIUS.sm,
  padding: "6px 8px",
  fontSize: TYPOGRAPHY.small.fontSize,
  fontFamily: "inherit",
  background: W,
};
export const btnPrimary = {
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
export const btnGhost = {
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
export const btnDanger = {
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

export function money(n) {
  const v = Number(n) || 0;
  return "Rp " + v.toLocaleString("id-ID");
}
