import { describe, it, expect } from "vitest";
import { normalizeBarcodeInput, findMenuByMenuId } from "./barcode.js";

describe("barcode lookup helpers", () => {
  it("normalizes scanned codes by trimming whitespace and newline characters", () => {
    expect(normalizeBarcodeInput("\n  M-1001  \r\n")).toBe("M-1001");
  });

  it("finds a menu item by menuId and ignores case differences", () => {
    const menu = [
      { id: "m-1", menuId: "M-1001", nama: "Kopi Susu" },
      { id: "m-2", menuId: "M-2002", nama: "Teh Tawar" },
    ];

    expect(findMenuByMenuId(menu, "m-1001")).toEqual(menu[0]);
    expect(findMenuByMenuId(menu, "M-2002")).toEqual(menu[1]);
  });

  it("returns null when the scanned code does not match any menuId", () => {
    const menu = [{ id: "m-1", menuId: "M-1001", nama: "Kopi Susu" }];
    expect(findMenuByMenuId(menu, "NOT-FOUND")).toBeNull();
  });
});
