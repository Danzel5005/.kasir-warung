import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createDeviceIdentity } = require("../electron/device-identity.cjs");
const { createDeviceSyncClient } = require("../electron/device-sync-client.cjs");

// ---------------------------------------------------------------------------
// PARITAS KRIPTO POS ↔ SERVER (Phase B)
//
// Edge Function `_shared/verify.ts` tidak bisa dijalankan di Vitest (Deno),
// jadi tes ini mereplikasi ALGORITMA verifikasinya dalam Node dan membuktikan
// bahwa signature yang dibuat client POS akan LULUS verifikasi server.
//
// Skema (harus sama persis):
//   signingKey = hexLower(sha256(device_secret))
//   signed     = `${timestamp}.${nonce}.${rawBody}`
//   signature  = hex(HMAC-SHA256(signingKey, signed))
// ---------------------------------------------------------------------------

/** Replikasi verify.ts: hmacHex + safeEqual. */
function serverVerify({ signingKey, timestamp, nonce, rawBody, signature }) {
  const expected = crypto.createHmac("sha256", signingKey).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
  if (expected.length !== signature.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex")); }
  catch { return false; }
}

const sha256Hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

let dir;
function freshIdentity() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-parity-"));
  return createDeviceIdentity({ secretPath: path.join(dir, ".pos_device") });
}

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

describe("kripto POS ↔ server: paritas HMAC", () => {
  it("signingKey yang dipakai client = sha256(device_secret)", async () => {
    const identity = freshIdentity();
    const fetchImpl = makeFetch({ body: { ok: true } });
    const client = createDeviceSyncClient({ identity, baseUrl: "https://x.test", fetchImpl });

    await client.push({ rows: [{ id: "t1" }] });

    const { init } = fetchImpl.calls[0];
    const ts = init.headers["X-Device-Timestamp"];
    const nonce = init.headers["X-Device-Nonce"];
    const signature = init.headers["X-Device-Signature"];

    // Server menyimpan credential_hash = sha256(secret). Verifikasi HARUS lolos.
    const signingKey = sha256Hex(identity.getSecret());
    expect(serverVerify({ signingKey, timestamp: ts, nonce, rawBody: init.body, signature })).toBe(true);
  });

  it("verifikasi GAGAL bila memakai secret mentah (bukan hash)", async () => {
    const identity = freshIdentity();
    const fetchImpl = makeFetch({ body: { ok: true } });
    const client = createDeviceSyncClient({ identity, baseUrl: "https://x.test", fetchImpl });
    await client.push({ rows: [{ id: "t1" }] });
    const { init } = fetchImpl.calls[0];
    const ok = serverVerify({
      signingKey: identity.getSecret(), // salah: secret mentah
      timestamp: init.headers["X-Device-Timestamp"],
      nonce: init.headers["X-Device-Nonce"],
      rawBody: init.body,
      signature: init.headers["X-Device-Signature"],
    });
    expect(ok).toBe(false);
  });

  it("body diubah setelah ditandatangani -> verifikasi gagal (anti-tamper)", async () => {
    const identity = freshIdentity();
    const fetchImpl = makeFetch({ body: { ok: true } });
    const client = createDeviceSyncClient({ identity, baseUrl: "https://x.test", fetchImpl });
    await client.push({ rows: [{ id: "t1" }] });
    const { init } = fetchImpl.calls[0];
    const ok = serverVerify({
      signingKey: sha256Hex(identity.getSecret()),
      timestamp: init.headers["X-Device-Timestamp"],
      nonce: init.headers["X-Device-Nonce"],
      rawBody: init.body.replace("t1", "t2"), // dirusak
      signature: init.headers["X-Device-Signature"],
    });
    expect(ok).toBe(false);
  });

  it("register mengirim secretProof = signingKey (device baru bisa diverifikasi)", async () => {
    const identity = freshIdentity();
    const fetchImpl = makeFetch({ body: { pairing_code: "AB12CD34" } });
    const client = createDeviceSyncClient({ identity, baseUrl: "https://x.test", fetchImpl });
    await client.register();

    const { init } = fetchImpl.calls[0];
    const body = JSON.parse(init.body);
    expect(body.secretProof).toBe(sha256Hex(identity.getSecret()));
    // Server (mode allowUnregistered) memakai secretProof sebagai keyOverride.
    expect(serverVerify({
      signingKey: body.secretProof,
      timestamp: init.headers["X-Device-Timestamp"],
      nonce: init.headers["X-Device-Nonce"],
      rawBody: init.body,
      signature: init.headers["X-Device-Signature"],
    })).toBe(true);
  });

  it("GET status: TANPA body, tanda tangan diverifikasi atas '{}'", async () => {
    const identity = freshIdentity();
    const fetchImpl = makeFetch({ body: { paired: false } });
    const client = createDeviceSyncClient({ identity, baseUrl: "https://x.test", fetchImpl });
    await client.getStatus();
    const { init } = fetchImpl.calls[0];

    // GET tidak boleh mengirim body (fetch menolaknya)...
    expect(init.body).toBeUndefined();
    // ...tetapi server menormalkan body kosong menjadi "{}" (lihat
    // devices-status/index.ts: `(await req.text()) || "{}"`).
    expect(serverVerify({
      signingKey: sha256Hex(identity.getSecret()),
      timestamp: init.headers["X-Device-Timestamp"],
      nonce: init.headers["X-Device-Nonce"],
      rawBody: "{}",
      signature: init.headers["X-Device-Signature"],
    })).toBe(true);
  });
});
