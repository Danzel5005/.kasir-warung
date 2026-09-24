import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createGrantSecret, signGrant, verifyGrant } = require("./host-identity.cjs");

// ---------------------------------------------------------------------------
// Fase 1 — host-identity: HMAC grant signing/verification.
// getHostId() butuh node-machine-id asli sehingga tidak dites di sini (nilainya
// dipakai lewat integration test host-server di bawah).
// ---------------------------------------------------------------------------

describe("host-identity: grant signing", () => {
  it("secret acak 32 byte (64 hex char) dan unik per pemanggilan", () => {
    const a = createGrantSecret();
    const b = createGrantSecret();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("signGrant deterministik & verifyGrant menerima tanda tangan yang cocok", () => {
    const secret = createGrantSecret();
    const payload = { hostId: "ABC123", hwid: "HW-1", userId: "kasir-1" };
    const sig1 = signGrant(secret, payload);
    const sig2 = signGrant(secret, payload);
    expect(sig1).toBe(sig2);
    expect(verifyGrant(secret, payload, sig1)).toBe(true);
  });

  it("urutan key payload tidak mempengaruhi tanda tangan (canonical)", () => {
    const secret = createGrantSecret();
    const sig1 = signGrant(secret, { a: 1, b: 2 });
    const sig2 = signGrant(secret, { b: 2, a: 1 });
    expect(sig1).toBe(sig2);
  });

  it("menolak tanda tangan dengan secret berbeda", () => {
    const payload = { hostId: "ABC123" };
    const sig = signGrant(createGrantSecret(), payload);
    expect(verifyGrant(createGrantSecret(), payload, sig)).toBe(false);
  });

  it("menolak bila payload diubah", () => {
    const secret = createGrantSecret();
    const sig = signGrant(secret, { userId: "kasir-1" });
    expect(verifyGrant(secret, { userId: "kasir-2" }, sig)).toBe(false);
  });
});
