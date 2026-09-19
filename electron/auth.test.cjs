import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { hashPassword, verifyPassword, verifyPasswordWithLegacy, isHashed } = require("./auth.cjs");
const { registerAuthHandlers } = require("./auth-ipc.cjs");

// ---------------------------------------------------------------------------
// Gap #1 — password tidak boleh lagi disimpan sebagai plaintext.
// ---------------------------------------------------------------------------

describe("auth.cjs: hashing password", () => {
  it("menghasilkan format scrypt:<salt>:<hash> dan bukan plaintext", () => {
    const stored = hashPassword("admin123");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(stored).not.toContain("admin123");
    expect(stored.split(":")).toHaveLength(3);
    expect(isHashed(stored)).toBe(true);
  });

  it("memakai salt acak sehingga hash password sama berbeda tiap kali", () => {
    expect(hashPassword("sama")).not.toBe(hashPassword("sama"));
  });

  it("verifyPassword menerima password benar dan menolak yang salah", () => {
    const stored = hashPassword("rahasia-ku");
    expect(verifyPassword("rahasia-ku", stored)).toBe(true);
    expect(verifyPassword("rahasia-ku ", stored)).toBe(false);
    expect(verifyPassword("RAHASIA-KU", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("verifyPassword menolak plaintext (tanpa prefix scrypt)", () => {
    expect(verifyPassword("admin123", "admin123")).toBe(false);
  });

  it("tidak melempar untuk nilai rusak / panjang hash berbeda", () => {
    expect(() => verifyPassword("x", "scrypt:abc")).not.toThrow();
    expect(verifyPassword("x", "scrypt:abc")).toBe(false);
    expect(verifyPassword("x", "scrypt::")).toBe(false);
    expect(verifyPassword("x", "scrypt:aa:bb")).toBe(false);
    // hash sah tapi dipotong -> panjang tidak sama, harus false bukan throw
    const good = hashPassword("p");
    expect(() => verifyPassword("p", good.slice(0, good.length - 4))).not.toThrow();
    expect(verifyPassword("p", good.slice(0, good.length - 4))).toBe(false);
  });

  it("menolak input non-string tanpa melempar", () => {
    for (const bad of [null, undefined, 123, {}, []]) {
      expect(verifyPassword(bad, hashPassword("p"))).toBe(false);
      expect(verifyPassword("p", bad)).toBe(false);
    }
  });
});

describe("auth.cjs: verifikasi dengan fallback plaintext (data lama)", () => {
  it("menerima password lama yang masih plaintext", () => {
    expect(verifyPasswordWithLegacy("admin123", "admin123")).toBe(true);
    expect(verifyPasswordWithLegacy("salah", "admin123")).toBe(false);
  });

  it("memakai jalur hash bila nilainya sudah ter-hash", () => {
    const stored = hashPassword("baru");
    expect(verifyPasswordWithLegacy("baru", stored)).toBe(true);
    expect(verifyPasswordWithLegacy("lama", stored)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// IPC handlers — memakai registry palsu, jadi main.cjs tidak perlu di-require.
// ---------------------------------------------------------------------------

function makeHarness(initialUsers = []) {
  const registry = {};
  let disk = JSON.parse(JSON.stringify(initialUsers));
  let writes = 0;
  registerAuthHandlers({
    ipcMain: { handle: (name, fn) => { registry[name] = fn; } },
    store: {
      read: () => JSON.parse(JSON.stringify(disk)),
      write: (list) => { disk = JSON.parse(JSON.stringify(list)); writes += 1; },
    },
  });
  return {
    call: (name, payload) => registry[name](null, payload),
    getDisk: () => disk,
    getWrites: () => writes,
  };
}

describe("auth-ipc: auth-login", () => {
  it("migrasi lazy: plaintext lama di-hash setelah login sukses", () => {
    const h = makeHarness([{ username: "admin", password: "admin123", nama: "Administrator", role: "admin" }]);
    expect(isHashed(h.getDisk()[0].password)).toBe(false);

    const result = h.call("auth-login", { username: "admin", password: "admin123" });

    expect(result.ok).toBe(true);
    expect(result.migrated).toBe(true);
    expect(h.getWrites()).toBe(1);
    // Yang tersimpan di disk sudah hash, dan hash-nya cocok dengan password asli.
    expect(isHashed(h.getDisk()[0].password)).toBe(true);
    expect(verifyPassword("admin123", h.getDisk()[0].password)).toBe(true);
  });

  it("TIDAK menulis apa pun bila login gagal", () => {
    const h = makeHarness([{ username: "admin", password: "admin123", role: "admin" }]);
    expect(h.call("auth-login", { username: "admin", password: "salah" }).ok).toBe(false);
    expect(h.call("auth-login", { username: "hantu", password: "admin123" }).reason).toBe("not-found");
    expect(h.getWrites()).toBe(0);
    expect(h.getDisk()[0].password).toBe("admin123");
  });

  it("login kedua tidak menulis ulang (sudah ter-hash)", () => {
    const h = makeHarness([{ username: "admin", password: "admin123", role: "admin" }]);
    h.call("auth-login", { username: "admin", password: "admin123" });
    const second = h.call("auth-login", { username: "admin", password: "admin123" });
    expect(second.ok).toBe(true);
    expect(second.migrated).toBe(false);
    expect(h.getWrites()).toBe(1);
  });

  it("tidak pernah mengembalikan password ke renderer", () => {
    const h = makeHarness([{ username: "admin", password: hashPassword("admin123"), role: "admin" }]);
    const result = h.call("auth-login", { username: "admin", password: "admin123" });
    expect(result.user).toBeDefined();
    expect(result.user.password).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("scrypt:");
  });

  it("username di-trim dan payload kosong ditolak", () => {
    const h = makeHarness([{ username: "kasir1", password: hashPassword("p"), role: "cashier" }]);
    expect(h.call("auth-login", { username: "  kasir1  ", password: "p" }).ok).toBe(true);
    expect(h.call("auth-login", {}).reason).toBe("invalid");
    expect(h.call("auth-login", undefined).reason).toBe("invalid");
    expect(h.call("auth-login", { username: "kasir1", password: 123 }).reason).toBe("invalid");
  });
});

describe("auth-ipc: auth-set-password & auth-change-own-password", () => {
  it("auth-set-password selalu menulis hash, bukan plaintext", () => {
    const h = makeHarness([{ username: "kasir1", password: hashPassword("lama"), role: "cashier" }]);
    expect(h.call("auth-set-password", { username: "kasir1", newPassword: "baru123" }).ok).toBe(true);
    const stored = h.getDisk()[0].password;
    expect(stored).not.toBe("baru123");
    expect(verifyPassword("baru123", stored)).toBe(true);
    expect(verifyPassword("lama", stored)).toBe(false);
  });

  it("auth-set-password menolak akun tidak dikenal / password kosong", () => {
    const h = makeHarness([{ username: "kasir1", password: hashPassword("lama") }]);
    expect(h.call("auth-set-password", { username: "hantu", newPassword: "x" }).reason).toBe("not-found");
    expect(h.call("auth-set-password", { username: "kasir1", newPassword: "" }).reason).toBe("invalid");
    expect(h.getWrites()).toBe(0);
  });

  it("ganti password sendiri butuh password lama yang benar", () => {
    const h = makeHarness([{ username: "admin", password: hashPassword("admin123"), role: "admin" }]);
    expect(h.call("auth-change-own-password", { username: "admin", oldPassword: "salah", newPassword: "baru123" }).reason).toBe("wrong-password");
    expect(h.getWrites()).toBe(0);

    expect(h.call("auth-change-own-password", { username: "admin", oldPassword: "admin123", newPassword: "baru123" }).ok).toBe(true);
    expect(verifyPassword("baru123", h.getDisk()[0].password)).toBe(true);
  });

  it("ganti password sendiri dari data plaintext lama tetap berhasil lalu ter-hash", () => {
    const h = makeHarness([{ username: "kasir1", password: "lama123", role: "cashier" }]);
    expect(h.call("auth-change-own-password", { username: "kasir1", oldPassword: "lama123", newPassword: "baru123" }).ok).toBe(true);
    expect(isHashed(h.getDisk()[0].password)).toBe(true);
  });
});

describe("auth-ipc: auth-create-user", () => {
  it("menyimpan user baru dengan password ter-hash", () => {
    const h = makeHarness([]);
    expect(h.call("auth-create-user", { user: { username: "kasir1", password: "rahasia", nama: "Budi", role: "cashier" } }).ok).toBe(true);
    const [created] = h.getDisk();
    expect(created.username).toBe("kasir1");
    expect(created.nama).toBe("Budi");
    expect(verifyPassword("rahasia", created.password)).toBe(true);
  });

  it("menolak username duplikat dan payload tidak lengkap", () => {
    const h = makeHarness([{ username: "admin", password: hashPassword("admin123"), role: "admin" }]);
    expect(h.call("auth-create-user", { user: { username: "admin", password: "x" } }).reason).toBe("duplicate");
    expect(h.call("auth-create-user", { user: { username: "kasir1", password: "" } }).reason).toBe("invalid");
    expect(h.call("auth-create-user", {}).reason).toBe("invalid");
    expect(h.getWrites()).toBe(0);
  });
});
