import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const {
  createDeviceIdentity,
  generateDeviceId,
  generateDeviceSecret,
  canonicalize,
  DEVICE_ID_PREFIX,
} = require("./device-identity.cjs");

// ---------------------------------------------------------------------------
// Device identity (PLAN-WEBSYNC) — device_id publik + device_secret rahasia.
// Semua fungsi murni fs/crypto, jadi bisa dites tanpa Electron.
// ---------------------------------------------------------------------------

let dir;
let identity;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-device-"));
  identity = createDeviceIdentity({ secretPath: path.join(dir, ".pos_device") });
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("device-identity: generator", () => {
  it("device_id ber-prefix dev_ dan panjang tetap", () => {
    const id = generateDeviceId();
    expect(id.startsWith(DEVICE_ID_PREFIX)).toBe(true);
    expect(id).toMatch(/^dev_[0-9a-f]{16}$/);
  });

  it("device_secret 64 hex char (256-bit)", () => {
    expect(generateDeviceSecret()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("setiap panggilan menghasilkan nilai berbeda", () => {
    expect(generateDeviceId()).not.toBe(generateDeviceId());
    expect(generateDeviceSecret()).not.toBe(generateDeviceSecret());
  });
});

describe("device-identity: penyimpanan", () => {
  it("ensure() membuat file lalu re-ensure mengembalikan identitas yang sama", () => {
    const first = identity.ensure();
    const second = identity.ensure();
    expect(second.deviceId).toBe(first.deviceId);
    expect(second.deviceSecret).toBe(first.deviceSecret);
    expect(fs.existsSync(identity.getPath())).toBe(true);
  });

  it("identitas persist antar instance (simulasi restart aplikasi)", () => {
    const a = identity.ensure();
    const reopened = createDeviceIdentity({ secretPath: identity.getPath() });
    expect(reopened.getDeviceId()).toBe(a.deviceId);
    expect(reopened.getSecret()).toBe(a.deviceSecret);
  });

  it("file korup tidak crash — identitas baru dibuat", () => {
    fs.writeFileSync(identity.getPath(), "not-base64-json", "utf8");
    const fresh = identity.ensure();
    expect(fresh.deviceId).toMatch(/^dev_[0-9a-f]{16}$/);
  });

  it("getPublicIdentity tidak pernah memuat secret", () => {
    const pub = identity.getPublicIdentity();
    expect(pub.deviceId).toBeTruthy();
    expect(pub).not.toHaveProperty("deviceSecret");
    expect(JSON.stringify(pub)).not.toContain(identity.getSecret());
  });
});

describe("device-identity: signing", () => {
  it("sign() deterministik & verify() menerima signature sendiri", () => {
    const payload = { deviceId: identity.getDeviceId(), n: 1 };
    const sig = identity.sign(payload);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.sign(payload)).toBe(sig);
    expect(identity.verify(payload, sig)).toBe(true);
  });

  it("urutan key tidak mengubah signature (canonical JSON)", () => {
    const sig1 = identity.sign({ b: 2, a: 1 });
    const sig2 = identity.sign({ a: 1, b: 2 });
    expect(sig1).toBe(sig2);
  });

  it("payload diubah -> verify gagal", () => {
    const sig = identity.sign({ amount: 100 });
    expect(identity.verify({ amount: 101 }, sig)).toBe(false);
  });

  it("verify menolak signature kosong / panjang salah tanpa throw", () => {
    expect(identity.verify({ a: 1 }, "")).toBe(false);
    expect(identity.verify({ a: 1 }, "abc")).toBe(false);
    expect(identity.verify({ a: 1 }, null)).toBe(false);
  });

  it("secret perangkat lain tidak bisa memverifikasi", () => {
    const other = createDeviceIdentity({ secretPath: path.join(dir, ".other") });
    other.ensure();
    const sig = other.sign({ x: 1 });
    expect(identity.verify({ x: 1 }, sig)).toBe(false);
  });
});

describe("device-identity: registration & rotate", () => {
  it("markRegistered/isRegistered/clearRegistration", () => {
    expect(identity.isRegistered()).toBe(false);
    identity.markRegistered("store_123");
    expect(identity.isRegistered()).toBe(true);
    expect(identity.getPublicIdentity().storeId).toBe("store_123");
    identity.clearRegistration();
    expect(identity.isRegistered()).toBe(false);
  });

  it("rotate() menghasilkan deviceId & secret baru", () => {
    const oldId = identity.getDeviceId();
    const oldSecret = identity.getSecret();
    const res = identity.rotate();
    expect(res.deviceId).not.toBe(oldId);
    expect(identity.getSecret()).not.toBe(oldSecret);
    expect(identity.isRegistered()).toBe(false); // pairing lama gugur
  });

  it("setName memberi batas panjang & fallback default", () => {
    identity.setName("  Kasir Depan  ");
    expect(identity.getDeviceName()).toBe("Kasir Depan");
    identity.setName("");
    expect(identity.getDeviceName().length).toBeGreaterThan(0);
  });
});

describe("device-identity: canonicalize", () => {
  it("nested object & array urut deterministik", () => {
    expect(canonicalize({ b: [2, 1], a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":[2,1]}');
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize("x")).toBe('"x"');
  });
});
