import { describe, expect, it, beforeEach } from "vitest";
import { createRequire } from "module";
import crypto from "crypto";

const require = createRequire(import.meta.url);
const { createDeviceSyncClient, MAX_SYNC_ROWS } = require("./device-sync-client.cjs");

// ---------------------------------------------------------------------------
// Device sync client — HTTP + HMAC signing. fetch disuntik, jadi tidak ada
// jaringan sungguhan di tes.
// ---------------------------------------------------------------------------

function makeIdentity(overrides = {}) {
  const secret = overrides.deviceSecret || "a".repeat(64);
  const deviceId = overrides.deviceId || "dev_0123456789abcdef";
  return {
    getDeviceId: () => deviceId,
    getSecret: () => secret,
    getDeviceName: () => "DEN POS — Test",
  };
}

/** Fake fetch yang merekam request terakhir dan mengembalikan respons. */
function makeFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const { status = 200, body = {} } = (typeof responder === "function" ? responder(url, init) : responder) || {};
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    };
  };
  fn.calls = calls;
  return fn;
}

/** Verifikasi signature persis seperti backend akan memeriksanya. */
function verifyHeaders(init, secret) {
  const body = init.body;
  const ts = init.headers["X-Device-Timestamp"];
  const nonce = init.headers["X-Device-Nonce"];
  const expected = crypto.createHmac("sha256", secret).update(`${ts}.${nonce}.${body}`).digest("hex");
  return expected === init.headers["X-Device-Signature"];
}

let identity;
let fetchImpl;

beforeEach(() => {
  identity = makeIdentity();
});

describe("device-sync-client: konfigurasi", () => {
  it("menolak tanpa identity / tanpa fetch", () => {
    expect(() => createDeviceSyncClient({ identity: null, fetchImpl: makeFetch({}) })).toThrow();
    expect(() => createDeviceSyncClient({ identity, fetchImpl: null, fetchUnavailable: true })).not.toThrow();
  });

  it("setBaseUrl menormalkan trailing slash", () => {
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com///", fetchImpl: makeFetch({}) });
    expect(c.getBaseUrl()).toBe("https://api.example.com");
  });

  it("register tanpa baseUrl -> error jelas", async () => {
    const c = createDeviceSyncClient({ identity, fetchImpl: makeFetch({}) });
    const res = await c.register();
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/URL backend/i);
  });
});

describe("device-sync-client: register", () => {
  it("mengirim deviceId & menandatangani request", async () => {
    fetchImpl = makeFetch({
      status: 201,
      body: { deviceId: identity.getDeviceId(), pairing_code: "AB12CD", expires_at: "2026-01-01T00:00:00Z", qr_payload: "denpos://pair?code=AB12CD" },
    });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const res = await c.register();
    expect(res.ok).toBe(true);
    expect(res.pairingCode).toBe("AB12CD");
    expect(res.qrPayload).toBe("denpos://pair?code=AB12CD");

    const { init, url } = fetchImpl.calls[0];
    expect(url).toBe("https://api.example.com/api/devices/register");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Device-ID"]).toBe(identity.getDeviceId());
    expect(verifyHeaders(init, identity.getSecret())).toBe(true);
    expect(JSON.parse(init.body).deviceName).toBe("DEN POS — Test");
  });

  it("respons error backend diteruskan sebagai { ok:false }", async () => {
    fetchImpl = makeFetch({ status: 400, body: { error: "DEVICE_EXISTS" } });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const res = await c.register();
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toBe("DEVICE_EXISTS");
  });
});

describe("device-sync-client: status pairing", () => {
  it("paired=true mengembalikan storeId & storeName", async () => {
    fetchImpl = makeFetch({ body: { paired: true, store_id: "store_9", store_name: "Warung Bu Tini", status: "active" } });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const res = await c.getStatus();
    expect(res).toMatchObject({ ok: true, paired: true, storeId: "store_9", storeName: "Warung Bu Tini" });
    const { url } = fetchImpl.calls[0];
    expect(url).toContain(`/api/devices/${identity.getDeviceId()}/status`);
  });

  it("belum paired -> paired=false", async () => {
    fetchImpl = makeFetch({ body: { paired: false } });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const res = await c.getStatus();
    expect(res.paired).toBe(false);
  });
});

describe("device-sync-client: push", () => {
  it("mengirim batch dengan batchId unik & rows dibatasi", async () => {
    fetchImpl = makeFetch({ body: { accepted: 2 } });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const res = await c.push({ kind: "transactions", rows: [{ id: 1 }, { id: 2 }] });
    expect(res.ok).toBe(true);
    expect(res.accepted).toBe(2);
    expect(res.batchId).toBeTruthy();
    const body = JSON.parse(fetchImpl.calls[0].init.body);
    expect(body.deviceId).toBe(identity.getDeviceId());
    expect(body.rows).toHaveLength(2);
    expect(verifyHeaders(fetchImpl.calls[0].init, identity.getSecret())).toBe(true);
  });

  it("rows melebihi MAX_SYNC_ROWS dipotong", async () => {
    fetchImpl = makeFetch({ body: {} });
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl });
    const rows = Array.from({ length: MAX_SYNC_ROWS + 50 }, (_, i) => ({ id: i }));
    await c.push({ rows });
    expect(JSON.parse(fetchImpl.calls[0].init.body).rows).toHaveLength(MAX_SYNC_ROWS);
  });
});

describe("device-sync-client: kegagalan jaringan", () => {
  it("fetch throw -> { ok:false, offline:true }", async () => {
    const failing = async () => { throw new Error("ECONNREFUSED"); };
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl: failing });
    const res = await c.getStatus();
    expect(res.ok).toBe(false);
    expect(res.offline).toBe(true);
    expect(res.error).toContain("ECONNREFUSED");
  });

  it("timeout (AbortError) -> pesan waktu koneksi habis", async () => {
    const aborting = async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; };
    const c = createDeviceSyncClient({ identity, baseUrl: "https://api.example.com", fetchImpl: aborting });
    const res = await c.push({ rows: [] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/waktu koneksi/i);
  });
});
