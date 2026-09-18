import { describe, expect, it } from "vitest";
import { resolveSessionUser } from "./useAuth.js";
import { isAdmin } from "../utilities/permissions.js";

// Regresi: di dev mode setiap restart, renderer reload. `activeShift` ikut
// ter-restore dari shifts.json (jadi layar login dilewati), tetapi `currentUser`
// dulu kembali null -> isAdmin(null) === false -> admin kehilangan SEMUA hak
// admin ("sama seperti non-admin"). Tes ini mengunci aturan pemulihan sesi.
describe("useAuth: pemulihan sesi login setelah restart", () => {
  const adminUser = { username: "admin", password: "admin123", nama: "Administrator", role: "admin" };
  const cashierUser = { username: "kasir1", password: "rahasia", nama: "Kasir", role: "cashier" };

  it("memulihkan user admin saat shift masih terbuka (bug utama)", () => {
    const restored = resolveSessionUser({
      hasOpenShift: true,
      sessionUsername: "admin",
      users: [adminUser, cashierUser],
    });
    expect(restored).toEqual(adminUser);
    // Inti keluhan: setelah restart admin harus TETAP admin.
    expect(isAdmin(restored)).toBe(true);
  });

  it("memulihkan hak cashier tanpa menaikkannya jadi admin", () => {
    const restored = resolveSessionUser({
      hasOpenShift: true,
      sessionUsername: "kasir1",
      users: [adminUser, cashierUser],
    });
    expect(isAdmin(restored)).toBe(false);
  });

  it("TIDAK memulihkan sesi bila tidak ada shift terbuka", () => {
    expect(resolveSessionUser({
      hasOpenShift: false,
      sessionUsername: "admin",
      users: [adminUser],
    })).toBeNull();
  });

  it("menolak sesi yatim: akun sudah dihapus tidak boleh hidup kembali", () => {
    const restored = resolveSessionUser({
      hasOpenShift: true,
      sessionUsername: "admin",
      users: [cashierUser],
    });
    expect(restored).toBeNull();
    expect(isAdmin(restored)).toBe(false);
  });

  it("tidak error saat storage kosong atau daftar users kosong", () => {
    expect(resolveSessionUser({ hasOpenShift: true, sessionUsername: null, users: [adminUser] })).toBeNull();
    expect(resolveSessionUser({ hasOpenShift: true, sessionUsername: "admin", users: [] })).toBeNull();
    expect(resolveSessionUser({ hasOpenShift: true, sessionUsername: "admin" })).toBeNull();
  });
});
