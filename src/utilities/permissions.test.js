import { describe, expect, it } from "vitest";
import { canAccessView, isAdmin } from "./permissions.js";

describe("permissions", () => {
  const admin = { username: "owner", role: "admin" };
  const cashier = { username: "cashier1", role: "cashier" };

  it("allows admins to access every view", () => {
    expect(isAdmin(admin)).toBe(true);
    for (const view of ["menu", "bills", "history", "laporan", "kelola"]) {
      expect(canAccessView(admin, view)).toBe(true);
    }
  });

  it("limits non-admins to cashier, reports, history, and open bills", () => {
    expect(isAdmin(cashier)).toBe(false);
    for (const view of ["menu", "bills", "history", "laporan"]) {
      expect(canAccessView(cashier, view)).toBe(true);
    }
    expect(canAccessView(cashier, "kelola")).toBe(false);
  });
});