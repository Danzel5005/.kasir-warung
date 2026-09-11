import { describe, it, expect } from "vitest";
import { updateCategoryLabel } from "./categoryManagement.js";

describe("categoryManagement", () => {
  it("keeps the category key unchanged when only the label is edited", () => {
    const cats = [
      { key: "kopi", label: "Kopi", tags: ["drinks"] },
      { key: "teh", label: "Teh", tags: [] },
    ];

    const result = updateCategoryLabel(cats, "kopi", "Espresso");

    expect(result).toEqual([
      { key: "kopi", label: "Espresso", tags: ["drinks"] },
      { key: "teh", label: "Teh", tags: [] },
    ]);
  });

  it("rejects duplicate category labels ignoring case", () => {
    const cats = [
      { key: "kopi", label: "Kopi", tags: [] },
      { key: "teh", label: "Teh", tags: [] },
    ];

    expect(() => updateCategoryLabel(cats, "kopi", "teh")).toThrow("Kategori sudah ada");
  });
});
