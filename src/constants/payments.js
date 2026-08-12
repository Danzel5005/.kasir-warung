const METODE_LABELS = {
  "cash":        "Tunai",
  "debit-bca":   "Debit BCA",
  "debit-bni":   "Debit BNI",
  "qris-bca":    "QRIS BCA",
  "qris-bni":    "QRIS BNI",
  // legacy compat
  "transfer-bca":"Debit BCA",
  "qris":        "QRIS BCA",
};

globalThis.METODE_LABELS = METODE_LABELS;

export {METODE_LABELS};