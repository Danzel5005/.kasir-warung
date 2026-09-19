import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const { checkForUpdate, compareVersions, parseVersion } = require("./update-check.cjs");

// ---------------------------------------------------------------------------
// Gap #3 — cek versi ringan. Sifat wajib: TIDAK PERNAH melempar, dan saat
// offline/gagal selalu dianggap "tidak ada update" (warung sering tanpa internet).
//
// Versi aplikasi disuntik lewat opsi `getCurrentVersion` (main.cjs membiarkannya
// default ke app.getVersion()). Modul "electron" tidak bisa di-vi.mock dari tes
// CJS karena `require` di vitest tidak melewati mock registry untuk CJS.
// ---------------------------------------------------------------------------

const asVersion = (v) => () => v;

describe("compareVersions", () => {
  it("membandingkan versi numerik dengan benar", () => {
    expect(compareVersions("1.2.0", "1.1.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.2.0")).toBe(-1);
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
  });

  it("menganggap jumlah segmen berbeda sebagai 0 di belakangnya", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBe(1);
  });

  it("mengabaikan prefix v dan spasi", () => {
    expect(compareVersions("v2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions(" 1.0.0 ", "1.0.0")).toBe(0);
  });

  it("memperlakukan segmen tidak valid sebagai 0 (tidak melempar)", () => {
    expect(() => compareVersions("abc", "1.0.0")).not.toThrow();
    expect(compareVersions("abc", "0.0.0")).toBe(0);
    expect(compareVersions(undefined, "0.0.0")).toBe(0);
  });
});

describe("parseVersion", () => {
  it("mengubah string versi menjadi array angka", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("v10.0.1")).toEqual([10, 0, 1]);
    expect(parseVersion(null)).toEqual([0]);
  });
});

describe("checkForUpdate", () => {
  const fetchOk = (manifest) => async () => manifest;

  it("melaporkan update saat manifest lebih tinggi dari versi saat ini", async () => {
    const res = await checkForUpdate({
      currentVersion: "1.1.0",
      fetchImpl: fetchOk({ version: "1.2.0", notes: "Ada fitur baru", url: "https://example.com/dl" }),
    });
    expect(res.hasUpdate).toBe(true);
    expect(res.latestVersion).toBe("1.2.0");
    expect(res.notes).toBe("Ada fitur baru");
    expect(res.url).toBe("https://example.com/dl");
  });

  it("tidak melaporkan update bila versi sama atau lebih rendah", async () => {
    for (const version of ["1.1.0", "1.0.9", "0.9.0"]) {
      const res = await checkForUpdate({ currentVersion: "1.1.0", fetchImpl: fetchOk({ version }) });
      expect(res.hasUpdate).toBe(false);
    }
  });

  it("memakai app.getVersion() bila currentVersion tidak diberikan", async () => {
    const res = await checkForUpdate({
      fetchImpl: fetchOk({ version: "9.9.9" }),
      getCurrentVersion: asVersion("1.1.0"),
    });
    expect(res.currentVersion).toBe("1.1.0");
    expect(res.hasUpdate).toBe(true);
  });

  it("jatuh ke 0.0.0 bila versi aplikasi tidak tersedia (bukan Electron)", async () => {
    const res = await checkForUpdate({ fetchImpl: fetchOk({ version: "1.0.0" }), getCurrentVersion: () => null });
    expect(res.currentVersion).toBe("0.0.0");
    expect(res.hasUpdate).toBe(true);
  });

  it("KUNCI: offline / error jaringan tidak melempar dan dianggap tanpa update", async () => {
    const failing = async () => { throw new Error("getaddrinfo ENOTFOUND"); };
    await expect(checkForUpdate({ currentVersion: "1.1.0", fetchImpl: failing })).resolves.toMatchObject({
      hasUpdate: false,
      latestVersion: null,
    });
    // Pesan konsol tidak boleh sampai ke renderer; cukup dicek tidak throw.
    const res = await checkForUpdate({ currentVersion: "1.1.0", fetchImpl: failing });
    expect(res.url).toBeNull();
  });

  it("manifest rusak / bukan objek tidak melempar", async () => {
    for (const bad of [null, undefined, "", 42, [], { version: 123 }]) {
      const res = await checkForUpdate({ currentVersion: "1.1.0", fetchImpl: async () => bad });
      expect(res.hasUpdate).toBe(false);
    }
  });

  it("field opsional hilang tetap aman", async () => {
    const res = await checkForUpdate({ currentVersion: "1.1.0", fetchImpl: fetchOk({ version: "2.0.0" }) });
    expect(res.hasUpdate).toBe(true);
    expect(res.notes).toBeNull();
    expect(res.url).toBeNull();
  });

  it("notes/url non-string tidak diteruskan sebagai string", async () => {
    const res = await checkForUpdate({
      currentVersion: "1.1.0",
      fetchImpl: fetchOk({ version: "2.0.0", notes: { a: 1 }, url: 42 }),
    });
    expect(res.notes).toBeNull();
    expect(res.url).toBeNull();
  });
});
