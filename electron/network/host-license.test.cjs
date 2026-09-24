import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createHostLicenseStore, buildGrantPayload } = require("./host-license.cjs");

// ---------------------------------------------------------------------------
// Fase 2 — host-license store (`.ykk_hostlic`). Diuji dengan `app` palsu yang
// getPath("userData")-nya menunjuk ke folder temp, jadi tidak menyentuh file user.
// ---------------------------------------------------------------------------

let tmpDir;
let fakeApp;
let store;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ykk-hostlic-"));
  fakeApp = { getPath: () => tmpDir };
  store = createHostLicenseStore(fakeApp);
});

afterEach(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
});

const sampleGrant = {
  hwid: "AAAA-BBBB-CCCC-DDDD",
  hostId: "HOSTTEST12345678",
  assignedUserId: "kasir-2",
  grantSignature: "deadbeef",
  activatedAt: "2026-01-01T00:00:00.000Z",
};

describe("host-license: file store", () => {
  it("status awal = activated:false", () => {
    expect(store.status()).toEqual({ activated: false });
    expect(store.read()).toBeNull();
  });

  it("write lalu read mengembalikan grant utuh (base64 di disk)", () => {
    const res = store.write(sampleGrant);
    expect(res.ok).toBe(true);

    // File di disk harus base64, bukan JSON polos.
    const rawDisk = fs.readFileSync(store.getPath(), "utf8");
    const decoded = JSON.parse(Buffer.from(rawDisk, "base64").toString("utf8"));
    expect(decoded.hostId).toBe(sampleGrant.hostId);

    const back = store.read();
    expect(back.hwid).toBe(sampleGrant.hwid);
    expect(back.assignedUserId).toBe("kasir-2");
    expect(back.grantSignature).toBe("deadbeef");
  });

  it("status melaporkan ringkasan grant tanpa signature", () => {
    store.write(sampleGrant);
    const st = store.status();
    expect(st).toEqual({
      activated: true,
      hostId: sampleGrant.hostId,
      assignedUserId: "kasir-2",
      activatedAt: sampleGrant.activatedAt,
    });
    expect(st.grantSignature).toBeUndefined();
  });

  it("write menolak grant tidak lengkap", () => {
    expect(store.write({ hwid: "X" }).ok).toBe(false);
    expect(store.write(null).ok).toBe(false);
    expect(store.status().activated).toBe(false);
  });

  it("read mengembalikan null untuk file korup / bukan base64 JSON valid", () => {
    fs.writeFileSync(store.getPath(), "BUKAN-BASE64-JSON", "utf8");
    expect(store.read()).toBeNull();
    expect(store.status()).toEqual({ activated: false });
  });

  it("clear menghapus grant", () => {
    store.write(sampleGrant);
    expect(store.status().activated).toBe(true);
    expect(store.clear().ok).toBe(true);
    expect(store.status().activated).toBe(false);
    expect(fs.existsSync(store.getPath())).toBe(false);
    // clear idempotent walau file sudah tidak ada.
    expect(store.clear().ok).toBe(true);
  });
});

describe("host-license: buildGrantPayload", () => {
  it("hanya menyertakan field yang ditandatangani", () => {
    const payload = buildGrantPayload({
      hwid: "H",
      hostId: "A",
      assignedUserId: "u",
      activatedAt: "t",
      extra: "diabaikan",
    });
    expect(payload).toEqual({ hwid: "H", hostId: "A", assignedUserId: "u", activatedAt: "t" });
    expect(payload.extra).toBeUndefined();
  });
});
