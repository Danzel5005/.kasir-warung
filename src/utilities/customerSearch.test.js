import { describe, it, expect } from "vitest";
import { sortCustomersAlphabetically, filterCustomers } from "./customerSearch.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { id: "c3", name: "citra", phone: "0813" },
  { id: "c1", name: "Budi", phone: "0811" },
  { id: "c2", name: "Andi", phone: "0812" },
  { id: "c4", name: "Dewi", phone: "0814" },
];

// ---------------------------------------------------------------------------
// sortCustomersAlphabetically
// ---------------------------------------------------------------------------

describe("sortCustomersAlphabetically", () => {
  it("sorts by name case-insensitively (A→Z)", () => {
    const names = sortCustomersAlphabetically(CUSTOMERS).map((c) => c.name);
    expect(names).toEqual(["Andi", "Budi", "citra", "Dewi"]);
  });

  it("does not mutate the input array", () => {
    const input = [...CUSTOMERS];
    sortCustomersAlphabetically(input);
    expect(input.map((c) => c.id)).toEqual(["c3", "c1", "c2", "c4"]);
  });

  it("tolerates missing/invalid entries", () => {
    const names = sortCustomersAlphabetically([{ id: "x" }, null, { name: "Zoe" }]).map(
      (c) => c?.name || "",
    );
    expect(names[names.length - 1]).toBe("Zoe");
  });
});

// ---------------------------------------------------------------------------
// filterCustomers
// ---------------------------------------------------------------------------

describe("filterCustomers", () => {
  it("returns ALL customers alphabetically when query is empty", () => {
    const names = filterCustomers(CUSTOMERS, "").map((c) => c.name);
    expect(names).toEqual(["Andi", "Budi", "citra", "Dewi"]);
  });

  it("returns all when query is only whitespace", () => {
    expect(filterCustomers(CUSTOMERS, "   ")).toHaveLength(4);
  });

  it("filters by name substring (case-insensitive)", () => {
    const names = filterCustomers(CUSTOMERS, "di").map((c) => c.name);
    expect(names).toEqual(["Andi", "Budi"]);
  });

  it("filters by phone number", () => {
    const names = filterCustomers(CUSTOMERS, "0814").map((c) => c.name);
    expect(names).toEqual(["Dewi"]);
  });

  it("keeps results alphabetically ordered while filtering", () => {
    const names = filterCustomers(
      [
        { id: "b", name: "Budi" },
        { id: "a", name: "Ani" },
      ],
      "",
    ).map((c) => c.name);
    expect(names).toEqual(["Ani", "Budi"]);
  });

  it("respects the limit", () => {
    expect(filterCustomers(CUSTOMERS, "", 2)).toHaveLength(2);
    expect(filterCustomers(CUSTOMERS, "", 2).map((c) => c.name)).toEqual(["Andi", "Budi"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCustomers(CUSTOMERS, "zzz")).toEqual([]);
  });

  it("handles an empty/missing customer list", () => {
    expect(filterCustomers([], "budi")).toEqual([]);
    expect(filterCustomers(undefined, "budi")).toEqual([]);
  });
});
