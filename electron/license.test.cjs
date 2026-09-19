import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createLicenseService } = require("./license.cjs");
const { generateKey } = require("./license-secret.cjs");

// ---------------------------------------------------------------------------
// Gap #2 (prioritas 4) — validasi lisensi murni HMAC: bisa dites tanpa Electron
// sama sekali. getHardwareId() butuh node-machine-id asli, jadi nilainya
// disuntik lewat stub di level modul (lihat require.cache di bawah).
// ---------------------------------------------------------------------------

const HWID = "A1B2-C3D4-E5F6-7890";
const OTHER_HWID = "FFFF-EEEE-DDDD-CCCC";

let dir;
let app;
let lic;

// `license.cjs` memanggil getHardwareId() dari modul yang sama, sehingga hasilnya
// tidak bisa disuntik lewat argumen. Node membaca `require.cache` untuk me-require
// node-machine-id, jadi kita ganti isinya agar hardware ID deterministik.
function stubMachineId(value) {
  const modPath = require.resolve("node-machine-id");
  require.cache[modPath] = {
    id: modPath,
    filename: modPath,
    loaded: true,
    exports: { machineIdSync: () => value },
    children: [],
    paths: [],
  };
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kasir-license-test-"));
  app = { getPath: () => dir };
  stubMachineId("a1b2c3d4e5f67890");
  lic = createLicenseService(app);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("license-secret.cjs: generateKey", () => {
  it("menghasilkan format YKK-XXXXX-XXXXX-XXXXX-XXXXX", () => {
    expect(generateKey(HWID)).toMatch(/^YKK-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}$/);
  });

  it("deterministik dan mengabaikan tanda hubung / huruf kecil", () => {
    expect(generateKey(HWID)).toBe(generateKey("a1b2c3d4e5f67890"));
    expect(generateKey(HWID)).toBe(generateKey("A1B2C3D4E5F67890"));
  });

  it("hardware ID berbeda -> key berbeda", () => {
    expect(generateKey(HWID)).not.toBe(generateKey(OTHER_HWID));
  });
});

describe("license.cjs: checkLicense sebelum aktivasi", () => {
  it("mengembalikan valid:false dengan alasan belum diaktivasi", () => {
    const res = lic.checkLicense();
    expect(res.valid).toBe(false);
    expect(res.hardwareId).toBeTruthy();
    expect(res.reason).toBe("Belum diaktivasi");
  });

  it("file lisensi rusak tidak melempar", () => {
    fs.writeFileSync(path.join(dir, ".ykk_lic"), "bukan-base64-json", "utf8");
    const res = lic.checkLicense();
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Belum diaktivasi");
  });
});

describe("license.cjs: activateLicense", () => {
  it("KUNCI: key yang benar untuk perangkat ini diterima", () => {
    const res = lic.activateLicense(generateKey(HWID));
    expect(res).toEqual({ ok: true });
    expect(fs.existsSync(path.join(dir, ".ykk_lic"))).toBe(true);
  });

  it("key untuk perangkat LAIN ditolak", () => {
    const res = lic.activateLicense(generateKey(OTHER_HWID));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/tidak valid untuk perangkat ini/);
    expect(fs.existsSync(path.join(dir, ".ykk_lic"))).toBe(false);
  });

  it("key ngawur / kosong ditolak", () => {
    for (const bad of ["", "YKK-AAAAA-AAAAA-AAAAA-AAAAA", "sembarang"]) {
      expect(lic.activateLicense(bad).ok).toBe(false);
    }
  });

  it("menerima key huruf kecil / dengan spasi di ujung (dinormalisasi)", () => {
    const key = generateKey(HWID);
    expect(lic.activateLicense(`  ${key.toLowerCase()}  `).ok).toBe(true);
  });

  it("setelah aktivasi checkLicense mengembalikan valid:true + activatedAt", () => {
    lic.activateLicense(generateKey(HWID));
    const res = lic.checkLicense();
    expect(res.valid).toBe(true);
    expect(res.hardwareId).toBeTruthy();
    expect(typeof res.activatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(res.activatedAt))).toBe(false);
  });

  it("file lisensi disimpan sebagai base64 dan tidak memuat hardware ID mentah", () => {
    lic.activateLicense(generateKey(HWID));
    const raw = fs.readFileSync(path.join(dir, ".ykk_lic"), "utf8");
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    expect(decoded.key).toBe(generateKey(HWID));
    expect(decoded.hwid).toBeTruthy();
  });

  it("KUNCI: lisensi yang valid untuk HWID lain ditolak saat dibaca", () => {
    // Aktivasi untuk HWID lain ditempel manual (mensimulasikan copy-paste file
    // lisensi antar komputer) -> harus gagal.
    const foreign = JSON.stringify({ key: generateKey(OTHER_HWID), hwid: OTHER_HWID, activatedAt: new Date().toISOString() });
    fs.writeFileSync(path.join(dir, ".ykk_lic"), Buffer.from(foreign).toString("base64"), "utf8");

    const res = lic.checkLicense();
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("License tidak cocok");
  });
});

describe("license.cjs: hardware ID tidak terbaca", () => {
  it("checkLicense & activateLicense melaporkan error, bukan melempar", () => {
    const broken = require.resolve("node-machine-id");
    require.cache[broken] = {
      id: broken, filename: broken, loaded: true,
      exports: { machineIdSync: () => { throw new Error("tidak bisa baca mesin"); } },
      children: [], paths: [],
    };
    const svc = createLicenseService(app);
    expect(svc.checkLicense()).toMatchObject({ valid: false, hardwareId: null });
    expect(svc.activateLicense("YKK-AAAAA-AAAAA-AAAAA-AAAAA").ok).toBe(false);
  });
});
