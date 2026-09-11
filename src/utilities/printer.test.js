import { describe, it, expect } from "vitest";
import { isPdfPrinterName, isThermalPrinterName, getPrinterSelectionStatus } from "./printer.js";

describe("printer selection helpers", () => {
  it("treats PDF virtual printers as non-thermal", () => {
    expect(isPdfPrinterName("Microsoft Print to PDF")).toBe(true);
    expect(isThermalPrinterName("Microsoft Print to PDF")).toBe(false);
    expect(getPrinterSelectionStatus("Microsoft Print to PDF")).toMatchObject({
      isPdf: true,
      isThermal: false,
      fallbackMode: "pdf",
    });
  });

  it("accepts physical thermal printer names", () => {
    expect(isPdfPrinterName("EPSON TM-T88V")).toBe(false);
    expect(isThermalPrinterName("EPSON TM-T88V")).toBe(true);
    expect(getPrinterSelectionStatus("EPSON TM-T88V")).toMatchObject({
      isPdf: false,
      isThermal: true,
      fallbackMode: "thermal",
    });
  });

  it("treats empty or unknown printer selection as system fallback", () => {
    expect(isThermalPrinterName(" ")).toBe(false);
    expect(getPrinterSelectionStatus(" ")).toMatchObject({
      isPdf: false,
      isThermal: false,
      fallbackMode: "system",
    });
  });
});
