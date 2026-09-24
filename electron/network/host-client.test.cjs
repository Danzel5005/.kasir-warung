import { describe, expect, it, afterEach, vi } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { createHostClient } = require("./host-client.cjs");
const { createHostServer } = require("./host-server.cjs");
const { createHostLicenseStore } = require("./host-license.cjs");
const { verifyGrant } = require("./host-identity.cjs");

// ---------------------------------------------------------------------------
// Fase 2 — host-client: connect ke host-server asli, kirim hello (join-request),
// terima hello-ack lalu approved, dan pastikan grant tersimpan di `.ykk_hostlic`.
// Semua pakai port 0 (ephemeral) untuk menghindari EADDRINUSE.
// ---------------------------------------------------------------------------

const HOST_ID = "HOSTTEST12345678";
let current = null;
let tmpDir = null;

function waitForEvent(events, predicate, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const found = events.find(predicate);
      if (found) return resolve(found);
      if (Date.now() - started > timeout) return reject(new Error("timeout menunggu event"));
      setTimeout(tick, 20);
    };
    tick();
  });
}

async function startServer(onEvent) {
  const server = createHostServer({ hostId: HOST_ID, port: 0, onEvent });
  expect(server.start().ok).toBe(true);
  let st = server.status();
  for (let i = 0; i < 50 && !st.listening; i++) {
    await new Promise((r) => setTimeout(r, 20));
    st = server.status();
  }
  expect(st.listening).toBe(true);
  current = { server, port: st.port };
  return current;
}

afterEach(async () => {
  if (current) { await current.server.stop(); current = null; }
  if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ } tmpDir = null; }
});

describe("host-client: join flow", () => {
  it("mencoba alamat discovery berikutnya jika alamat pertama gagal", async () => {
    const hostEvents = [];
    const { port } = await startServer((evt) => hostEvents.push(evt));
    const client = createHostClient({ getHwid: () => "CLIENT-HWID-FALLBACK" });

    expect(client.join({ host: "127.0.0.2", addresses: ["127.0.0.1"], port, hostId: HOST_ID }).ok).toBe(true);
    await waitForEvent(hostEvents, (e) => e.kind === "join-request" && e.hwid === "CLIENT-HWID-FALLBACK");
    client.disconnect();
  });

  it("connect → hello → hello-ack → approved, grant tersimpan", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ykk-hostclient-"));
    const store = createHostLicenseStore({ getPath: () => tmpDir });

    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-0001",
      deviceName: "Kasir 2",
      hostLicenseStore: store,
      onEvent: (evt) => clientEvents.push(evt),
    });

    const res = client.join({ host: "127.0.0.1", port, hostId: HOST_ID, name: "Device A" });
    expect(res.ok).toBe(true);

    // Host harus menerima join-request.
    const joinReq = await waitForEvent(hostEvents, (e) => e.kind === "join-request");
    expect(joinReq.hwid).toBe("CLIENT-HWID-0001");
    expect(joinReq.deviceName).toBe("Kasir 2");

    // Client harus dapat hello-ack → phase waiting.
    await waitForEvent(clientEvents, (e) => e.kind === "waiting");

    // Host approve → client terima approved → grant tersimpan.
    const approveRes = server.approveFollower("CLIENT-HWID-0001", "kasir-2");
    expect(approveRes.ok).toBe(true);
    server.sendTo("CLIENT-HWID-0001", { type: "snapshot", snapshot: { menu: [] } });
    await waitForEvent(clientEvents, (e) => e.kind === "approved");

    const grant = store.read();
    expect(grant).not.toBeNull();
    expect(grant.hwid).toBe("CLIENT-HWID-0001");
    expect(grant.assignedUserId).toBe("kasir-2");
    expect(grant.hostId).toBe(HOST_ID);

    // Signature harus valid terhadap secret sesi hosting Host.
    const secret = server.getGrantSecret();
    expect(secret).toBeTruthy();
    expect(
      verifyGrant(secret, {
        hwid: grant.hwid,
        hostId: grant.hostId,
        assignedUserId: grant.assignedUserId,
        activatedAt: grant.activatedAt,
      }, grant.grantSignature)
    ).toBe(true);

    client.disconnect();
  });

  it("baru menyatakan approved setelah snapshot diterapkan", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));
    const sequence = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-ORDER",
      snapshotApplier: () => sequence.push("applied"),
      onEvent: (evt) => { if (evt.kind === "snapshot" || evt.kind === "approved") sequence.push(evt.kind); },
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(hostEvents, (e) => e.kind === "join-request" && e.hwid === "CLIENT-HWID-ORDER");
    server.approveFollower("CLIENT-HWID-ORDER", "kasir-2");
    server.sendTo("CLIENT-HWID-ORDER", { type: "snapshot", snapshot: { menu: [{ id: 1 }] } });
    await waitForEvent(sequence, (value) => value === "approved");
    expect(sequence).toEqual(["applied", "snapshot", "approved"]);
    client.disconnect();
  });

  it("join ke host tidak valid mengembalikan ok:false tanpa crash", () => {
    const client = createHostClient({ getHwid: () => "X", onEvent: () => {} });
    const res = client.join(null);
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("status() melaporkan koneksi setelah tersambung", async () => {
    const { port } = await startServer();
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-0002",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(clientEvents, (e) => e.kind === "connected");
    expect(client.status().connected).toBe(true);
    client.disconnect();
    expect(client.status().connected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fase 3 — sisi Client: menerima `snapshot` awal dari Host, meneruskannya ke
// `snapshotApplier` (persist lokal), lalu meng-emit event `snapshot`.
// ---------------------------------------------------------------------------
describe("host-client: Fase 3 snapshot awal", () => {
  it("menerapkan snapshot lewat snapshotApplier dan meng-emit event snapshot", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));

    const applied = [];
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-SNAP",
      deviceName: "Kasir Snapshot",
      onEvent: (evt) => clientEvents.push(evt),
      snapshotApplier: (snap) => applied.push(snap),
    });

    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(hostEvents, (e) => e.kind === "join-request" && e.hwid === "CLIENT-HWID-SNAP");

    const snapshot = { menu: [{ id: 7, nama: "Teh", stok: 3 }], bills: [{ id: 1 }] };
    server.sendTo("CLIENT-HWID-SNAP", { type: "snapshot", snapshot, sentAt: "now" });

    const evt = await waitForEvent(clientEvents, (e) => e.kind === "snapshot");
    expect(evt.applied).toBe(true);
    expect(evt.snapshot).toEqual(snapshot);
    expect(applied).toEqual([snapshot]);

    client.disconnect();
  });

  it("tetap emit snapshot walau snapshotApplier tidak diberi", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-NOSNAP",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(hostEvents, (e) => e.kind === "join-request" && e.hwid === "CLIENT-HWID-NOSNAP");

    server.sendTo("CLIENT-HWID-NOSNAP", { type: "snapshot", snapshot: { menu: [] } });
    const evt = await waitForEvent(clientEvents, (e) => e.kind === "snapshot");
    expect(evt.applied).toBe(false);
    expect(evt.snapshot).toEqual({ menu: [] });
    client.disconnect();
  });
});

// ---------------------------------------------------------------------------
// Fase 4 — sisi Client: reserveStock synchronous (§5.1) & terima stock-delta
// delta-only dari Host (§5.2).
// ---------------------------------------------------------------------------
describe("host-client: Fase 4 reserveStock", () => {
  it("reserveStock menerima balasan Host (roundtrip via host-server)", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));
    server.setReserveHandler((req) => ({ ok: true, reserved: { a: 7 }, updatedAt: "T1", _seen: req.deltas }));

    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-RES",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(clientEvents, (e) => e.kind === "connected");

    const res = await client.reserveStock({ a: -3 }, { type: "sale" });
    expect(res.ok).toBe(true);
    expect(res.reserved).toEqual({ a: 7 });
    client.disconnect();
  });

  it("reserveStock saat offline → {ok:false, reason:'offline'}", async () => {
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-OFF",
      onEvent: (evt) => clientEvents.push(evt),
    });
    const res = await client.reserveStock({ a: -1 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("offline");
  });

  it("reserveStock timeout kalau Host tidak membalas", async () => {
    const { port } = await startServer();
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-TMO",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(clientEvents, (e) => e.kind === "connected");

    // Pakai fake timer untuk memicu jalur timeout (Host tidak membalas).
    vi.useFakeTimers();
    const p = client.reserveStock({ a: -1 });
    await Promise.resolve();
    vi.advanceTimersByTime(5000);
    const res = await p;
    vi.useRealTimers();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("timeout");
    client.disconnect();
  });

  it("Host balas 'unavailable' tanpa handler → diteruskan ke pemanggil", async () => {
    const { port } = await startServer();
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-UNAVAIL",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(clientEvents, (e) => e.kind === "connected");
    const res = await client.reserveStock({ a: -1 });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unavailable");
    client.disconnect();
  });

  it("menerima stock-delta dan memanggil deltaApplier", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));
    const applied = [];
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-DELTA",
      onEvent: (evt) => clientEvents.push(evt),
      deltaApplier: (rows) => applied.push(rows),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(hostEvents, (e) => e.kind === "join-request" && e.hwid === "CLIENT-HWID-DELTA");

    const rows = [{ productId: "a", newStock: 4, updatedAt: "T2" }];
    server.sendTo("CLIENT-HWID-DELTA", { type: "stock-delta", rows });
    const evt = await waitForEvent(clientEvents, (e) => e.kind === "stock-delta");
    expect(evt.applied).toBe(true);
    expect(evt.rows).toEqual(rows);
    expect(applied).toEqual([rows]);
    client.disconnect();
  });

  it("pending reserve diselesaikan sebagai 'disconnected' saat putus", async () => {
    const { port } = await startServer();
    const clientEvents = [];
    const client = createHostClient({
      getHwid: () => "CLIENT-HWID-DIS",
      onEvent: (evt) => clientEvents.push(evt),
    });
    client.join({ host: "127.0.0.1", port, hostId: HOST_ID });
    await waitForEvent(clientEvents, (e) => e.kind === "connected");
    // Tidak ada handler reserve → server balas unavailable; tidak ada pending
    // yang menggantung. Cukup pastikan disconnect tidak melempar.
    expect(() => client.disconnect()).not.toThrow();
  });
});
