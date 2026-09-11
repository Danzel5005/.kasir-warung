export function isPdfPrinterName(name = "") {
  return typeof name === "string" && /pdf/i.test(name.trim());
}

export function isThermalPrinterName(name = "") {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) return false;
  if (isPdfPrinterName(value)) return false;

  return /(thermal|epson|star|bom|pos|tm-|ts-|receipt|kiosk|printer)/i.test(value);
}

export function getPrinterSelectionStatus(name = "") {
  const value = typeof name === "string" ? name.trim() : "";

  if (isPdfPrinterName(value)) {
    return { isPdf: true, isThermal: false, fallbackMode: "pdf", name: value };
  }

  if (isThermalPrinterName(value)) {
    return { isPdf: false, isThermal: true, fallbackMode: "thermal", name: value };
  }

  return { isPdf: false, isThermal: false, fallbackMode: "system", name: value };
}
