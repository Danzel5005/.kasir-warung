import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createDeviceIdentity } = require("./device-identity.cjs");
const { createDeviceSyncService } = require("./device-sync-service.cjs");
const { createDeviceSyncClient } = require("./device-sync-client.cjs");

// ---------------------------------------------------------------------------
// Device sync service — menyatukan identity + client + IPC. Client disuntik
// dengan fetch palsu supaya tes tidak menyentuh jaringan.
// ---------------------------------------------------------------------------

function makeFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const { status = 200, body = {} } = (typeof responder === "function" ? responder(url, init) : responder) || {};
    return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
  };
  fn.calls = calls;
  return fn;
}

let dir;
let identity;
let fetchImpl;
let svc;

function build(responder) {
  fetchImpl = makeFetch(responder);
  identity = createDeviceIdentity({ secretPath: path.join(dir, ".pos_device") });
  const client = createDeviceSyncClient({ identity, fetchImpl });
  svc = createDeviceSyncService({ identity, client, configPath: path.join(dir, "device-sync.json") });
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-device-svc-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("device-sync-service: status & konfigurasi", () => {
  it("getStatus mengembalikan identitas publik tanpa secret", () => {
    build({});
    const s = svc.getStatus();
    expect(s.ok).toBe(true);
    expect(s.identity.deviceId).toMatch(/^dev_/);
    expect(s.identity).not.toHaveProperty("deviceSecret");
    expect(s.configured).toBe(false);
  });

  it("setBaseUrl menormalkan, persist ke file, & memengaruhi client", () => {
    build({});
    svc.setBaseUrl("https://cloud.denpos.id/");
    expect(svc.getBaseUrl()).toBe("https://cloud.denpos.id");
    const persisted = JSON.parse(fs.readFileSync(path.join(dir, "device-sync.json"), "utf8"));
    expect(persisted.baseUrl).toBe("https://cloud.denpos.id");
    expect(svc.getStatus().configured).toBe(true);
  });

  it("baseUrl tersimpan dimuat ulang oleh instance baru", () => {
    build({});
    svc.setBaseUrl("https://cloud.denpos.id");
    const reopened = createDeviceSyncService({
      identity,
      client: createDeviceSyncClient({ identity, fetchImpl }),
      configPath: path.join(dir, "device-sync.json"),
    });
    expect(reopened.getBaseUrl()).toBe("https://cloud.denpos.id");
  });

  it("getCredentialForPairing mengembalikan secret untuk alur pairing manual", () => {
    build({});
    const c = svc.getCredentialForPairing();
    expect(c.ok).toBe(true);
    expect(c.deviceSecret).toBe(identity.getSecret());
  });
});

describe("device-sync-service: register & pairing", () => {
  it("register tanpa baseUrl -> error", async () => {
    build({});
    const res = await svc.register();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/URL backend/i);
  });

  it("register sukses mengembalikan pairing code", async () => {
    build({ body: { deviceId: "dev_x", pairing_code: "XY99", expires_at: "2026-01-01T00:10:00Z" } });
    svc.setBaseUrl("https://cloud.denpos.id");
    const res = await svc.register();
    expect(res.ok).toBe(true);
    expect(res.pairingCode).toBe("XY99");
  });

  it("checkPairing paired=true menandai identitas terdaftar", async () => {
    build({ body: { paired: true, store_id: "store_7", store_name: "Toko A" } });
    svc.setBaseUrl("https://cloud.denpos.id");
    const res = await svc.checkPairing();
    expect(res.paired).toBe(true);
    expect(res.identity.registered).toBe(true);
    expect(res.identity.storeId).toBe("store_7");
  });

  it("checkPairing paired=false mencabut status terdaftar (revoke dari web)", async () => {
    build({ body: { paired: true, store_id: "store_7" } });
    svc.setBaseUrl("https://cloud.denpos.id");
    await svc.checkPairing();
    expect(identity.isRegistered()).toBe(true);

    build({ body: { paired: false } });
    svc.setBaseUrl("https://cloud.denpos.id");
    const res = await svc.checkPairing();
    expect(res.paired).toBe(false);
    expect(identity.isRegistered()).toBe(false);
  });
});

describe("device-sync-service: push", () => {
  it("push tanpa pairing -> ditolak", async () => {
    build({ body: {} });
    svc.setBaseUrl("https://cloud.denpos.id");
    const res = await svc.push({ rows: [{ id: 1 }] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/belum dipasangkan/i);
  });

  it("push setelah pairing diteruskan ke client", async () => {
    build({ body: { accepted: 1 } });
    svc.setBaseUrl("https://cloud.denpos.id");
    identity.markRegistered("store_1");
    const res = await svc.push({ rows: [{ id: 1 }] });
    expect(res.ok).toBe(true);
    expect(res.accepted).toBe(1);
  });
});

describe("device-sync-service: rotate & nama", () => {
  it("rotateCredential mengubah deviceId dan menghapus pairing", () => {
    build({});
    identity.markRegistered("store_1");
    const before = svc.getIdentity().deviceId;
    const res = svc.rotateCredential();
    expect(res.ok).toBe(true);
    expect(svc.getIdentity().deviceId).not.toBe(before);
    expect(svc.getIdentity().registered).toBe(false);
  });

  it("setDeviceName memperbarui identitas publik", () => {
    build({});
    svc.setDeviceName("Kasir Lantai 2");
    expect(svc.getIdentity().deviceName).toBe("Kasir Lantai 2");
  });
});

describe("device-sync-service: IPC handlers", () => {
  it("mendaftarkan seluruh channel device-*", () => {
    build({});
    const registered = new Map();
    const ipcMain = { handle: (ch, fn) => registered.set(ch, fn) };
    svc.registerHandlers(ipcMain);
    for (const ch of [
      "device-identity",
      "device-status",
      "device-set-base-url",
      "device-register",
      "device-check-pairing",
      "device-push-sync",
      "device-credential",
      "device-rotate-credential",
      "device-set-name",
    ]) {
      expect(registered.has(ch), `channel ${ch} terdaftar`).toBe(true);
    }
  });

  it("ipcMain tidak valid -> throw", () => {
    build({});
    expect(() => svc.registerHandlers(null)).toThrow();
  });

  it("handler device-status mengembalikan identitas publik", () => {
    build({});
    const registered = new Map();
    svc.registerHandlers({ handle: (ch, fn) => registered.set(ch, fn) });
    const out = registered.get("device-status")();
    expect(out.identity.deviceId).toMatch(/^dev_/);
    expect(out.identity).not.toHaveProperty("deviceSecret");
  });
});
