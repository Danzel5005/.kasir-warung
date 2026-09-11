import { describe, expect, it } from "vitest";
import { getCategoryName } from "./receipt.js";
import categoryLabelModule from "../../electron/category-label.cjs";

const { getCategoryLabel } = categoryLabelModule;

const cases = [
  ["food", [{ key: "food", label: "Makanan" }]],
  ["drink", [{ id: "drink", name: "Minuman" }]],
  ["missing", [{ key: "food", label: "Makanan" }]],
  ["", []],
];

describe("category label parity", () => {
  it.each(cases)("resolves the same label for %s", (key, cats) => {
    expect(getCategoryName(key, cats)).toBe(getCategoryLabel(key, cats));
  });
});
