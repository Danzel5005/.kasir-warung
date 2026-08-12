// Design System Tokens for restaurant / Kasir Warung Nusantara

/**
 * 8-Step Color Palette
 */
export const COLOR_PALETTE = {
  // Brand / Primary (Emerald Green)
  primary: "#1a5c38",
  primaryDark: "#0f3d24",
  primaryLight: "#e8f5ee",

  // Accent / Secondary (Warm Orange)
  secondary: "#e87c2a",
  secondaryLight: "#fff8e0",

  // Status & Semantics
  danger: "#d32f2f",
  dangerLight: "#ffebee",
  info: "#1a5fb4",
  infoLight: "#e8f0fe",
  warning: "#c05a00",
  warningLight: "#fff0e8",
  teal: "#0a7a7a",
  tealLight: "#e0f5f5",

  // Neutrals & Surface Colors
  background: "#0f0e0c",
  surface: "#ffffff",
  surfaceAlt: "#f5f5f0",
  border: "#e0e0d8",
  textPrimary: "#1a1a1a",
  textSecondary: "#666666",
  textMuted: "#888888",
};

/**
 * Payment Method Specific Colors (Standardized mapping)
 */
export const METODE_COLORS = {
  "cash":         { bg: COLOR_PALETTE.secondaryLight, tc: "#b87a00" },
  "debit-bca":    { bg: COLOR_PALETTE.infoLight, tc: COLOR_PALETTE.info },
  "debit-bni":    { bg: COLOR_PALETTE.warningLight, tc: COLOR_PALETTE.warning },
  "qris-bca":     { bg: COLOR_PALETTE.primaryLight, tc: COLOR_PALETTE.primary },
  "qris-bni":     { bg: COLOR_PALETTE.tealLight, tc: COLOR_PALETTE.teal },
  "transfer-bca": { bg: COLOR_PALETTE.infoLight, tc: COLOR_PALETTE.info },
  "qris":         { bg: COLOR_PALETTE.primaryLight, tc: COLOR_PALETTE.primary },
};

/**
 * 6-Step Typographic Scale
 */
export const TYPOGRAPHY = {
  h1: { fontSize: 24, lineHeight: 1.2, fontWeight: 700 },
  h2: { fontSize: 18, lineHeight: 1.3, fontWeight: 700 },
  body: { fontSize: 14, lineHeight: 1.4, fontWeight: 400 },
  small: { fontSize: 12, lineHeight: 1.4, fontWeight: 400 },
  label: { fontSize: 11, lineHeight: 1.3, fontWeight: 600 },
  code: { fontSize: 12, fontFamily: "monospace" },
};

/**
 * 5 Border Radius Tokens
 */
export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

/**
 * Standardized Input & Form Layout Style Tokens
 */
export const inp = {
  width: "100%",
  padding: "8px 10px",
  boxSizing: "border-box",
  border: `1px solid ${COLOR_PALETTE.border}`,
  borderRadius: RADIUS.md,
  fontSize: TYPOGRAPHY.small.fontSize,
  fontFamily: "inherit",
  outline: "none",
  background: COLOR_PALETTE.surface,
};

export const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

// Legacy shorthand aliases for backward compatibility across existing files
export const G = COLOR_PALETTE.primary;
export const OR = COLOR_PALETTE.secondary;
export const W = COLOR_PALETTE.surface;
export const LT = COLOR_PALETTE.surfaceAlt;
export const BD = COLOR_PALETTE.border;
export const TX = COLOR_PALETTE.textPrimary;
export const MT = COLOR_PALETTE.textMuted;
