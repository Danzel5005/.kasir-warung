import { describe, expect, it, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createPairing } = require("./pairing.cjs");
const { createHostServer } = require("./host-server.cjs");
const { verifyGrant } = require("./host-identity.cjs");

// ---------------------------------------------------------------------------
// Fase 3 — pairing: bookkeeping join-request, assign akun non-admin, tanda
// tangan grant (lewat host-server), dan push snapshot awal SEKALI ke device
// yang baru di-approve. Pakai host-server asli (port 0) supaya jalur WS nyata
// ikut teruji, plus provider palsu (DI) untuk users/snapshot.
// ---------------------------------------------------------------------------

const HOST_ID = "PAIRTEST12345678";
let current = null;

function waitFor(events, predicate, timeout = 2500) {
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

// Registrasi follower ke server lewat WS nyata supaya approveFollower menemukan
// koneksinya (mencocokkan hwid). Mengembalikan {ws, messages}.
function connectFollower(port, hwid, deviceName = "Kasir 2") {
  const WebSocket = require("ws");
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const messages = [];
  ws.on("message", (raw) => { try { messages.push(JSON.parse(raw.toString())); } catch (_) { /* ignore */ } });
  const ready = new Promise((resolve) => ws.on("open", () => {
    ws.send(JSON.stringify({ type: "hello", hwid, deviceName }));
    resolve();
  }));
  return { ws, messages, ready };
}

afterEach(async () => {
  if (current) { await current.server.stop(); current = null; }
});

describe("pairing: trackRequest & listAssignableUsers", () => {
  it("mencatat join-request dan menyortir berdasarkan firstSeen", () => {
    const pairing = createPairing({ hostServer: { approveFollower: () => ({ ok: false }), sendTo: () => false } });
    pairing.trackRequest({ hwid: "B", deviceName: "Kasir B" });
    pairing.trackRequest({ hwid: "A", deviceName: "Kasir A" });
    const list = pairing.listRequests();
    expect(list.map((r) => r.hwid)).toEqual(["B", "A"]); // urutan insert
    expect(list[0].status).toBe("pending");
  });

  it("reconnect mempertahankan status approved, tapi refresh deviceName", () => {
    const pairing = createPairing({ hostServer: { approveFollower: () => ({ ok: false }), sendTo: () => false } });
    pairing.trackRequest({ hwid: "X", deviceName: "Lama" });
    // paksa approved
    pairing.listRequests()[0].status = "approved";
    pairing.trackRequest({ hwid: "X", deviceName: "Baru" });
    const [entry] = pairing.listRequests();
    expect(entry.status).toBe("approved");
    expect(entry.deviceName).toBe("Baru");
  });

  it("hanya mengekspos user non-admin sebagai akun assignable", () => {
    const users = [
      { username: "admin", nama: "Administrator", role: "admin" },
      { username: "kasir1", nama: "Kasir Satu", role: "cashier" },
      { username: "kasir2", nama: "Kasir Dua" }, // role default → cashier
    ];
    const pairing = createPairing({ hostServer: {}, getUsers: () => users });
    const assignable = pairing.listAssignableUsers();
    expect(assignable.map((u) => u.username)).toEqual(["kasir1", "kasir2"]);
    expect(assignable[1].role).toBe("cashier");
  });
});

describe("pairing: approve flow (end-to-end WS)", () => {
  it("approve → grant tertanda tangan + snapshot dikirim tepat sekali", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));

    const snapshot = { menu: [{ id: 1, nama: "Kopi", stok: 10 }], settings: { warungName: "Warung A" } };
    let snapshotCalls = 0;
    const pairing = createPairing({
      hostServer: server,
      getUsers: () => [{ username: "admin", role: "admin" }, { username: "kasir1", nama: "Kasir", role: "cashier" }],
      buildSnapshot: () => { snapshotCalls++; return snapshot; },
      onEvent: (evt) => hostEvents.push(evt),
    });

    const follower = connectFollower(port, "HW-1", "Kasir Depan");
    await follower.ready;
    // beri waktu server memproses 'hello'
    await waitFor(hostEvents, (e) => e.kind === "join-request");
    pairing.trackRequest({ hwid: "HW-1", deviceName: "Kasir Depan" });

    const res = await pairing.approve({ hwid: "HW-1", userId: "kasir1" });
    expect(res.ok).toBe(true);
    expect(snapshotCalls).toBe(1);
    expect(res.snapshotSent).toBe(true);
    expect(typeof res.grantSignature).toBe("string");

    // grant harus lolos verifikasi pakai secret sesi hosting
    const secret = server.getGrantSecret();
    const payload = { hwid: "HW-1", hostId: HOST_ID, assignedUserId: "kasir1", activatedAt: res.activatedAt };
    expect(verifyGrant(secret, payload, res.grantSignature)).toBe(true);

    // follower menerima approved lalu snapshot
    const approved = await waitFor(follower.messages, (m) => m.type === "approved");
    expect(approved.assignedUserId).toBe("kasir1");
    expect(approved.grantSignature).toBe(res.grantSignature);
    const snapMsg = await waitFor(follower.messages, (m) => m.type === "snapshot");
    expect(snapMsg.snapshot).toEqual(snapshot);

    // status berubah jadi approved di daftar
    expect(pairing.listRequests().find((r) => r.hwid === "HW-1").status).toBe("approved");
    follower.ws.close();
  });

  it("approve tanpa userId ditolak", async () => {
    const { server } = await startServer(() => {});
    const pairing = createPairing({ hostServer: server, buildSnapshot: () => ({}) });
    const res = await pairing.approve({ hwid: "HW-1" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/akun/i);
  });

  it("approve device yang tidak terhubung gagal (dari host-server)", async () => {
    const { server } = await startServer(() => {});
    const pairing = createPairing({ hostServer: server, buildSnapshot: () => ({}) });
    const res = await pairing.approve({ hwid: "TIDAK-ADA", userId: "kasir1" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/tidak terhubung/i);
  });

  it("device yang sudah ditolak tidak bisa di-approve", async () => {
    const { server } = await startServer(() => {});
    const pairing = createPairing({ hostServer: server, buildSnapshot: () => ({}) });
    pairing.trackRequest({ hwid: "HW-9", deviceName: "Nakal" });
    pairing.reject({ hwid: "HW-9" });
    const res = await pairing.approve({ hwid: "HW-9", userId: "kasir1" });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ditolak/i);
  });
});

describe("pairing: reject", () => {
  it("menandai request rejected + kirim pesan rejected ke follower", async () => {
    const hostEvents = [];
    const { server, port } = await startServer((evt) => hostEvents.push(evt));
    const pairing = createPairing({ hostServer: server, buildSnapshot: () => ({}) });
    const follower = connectFollower(port, "HW-R", "Ditolak");
    await follower.ready;
    // tunggu server memproses 'hello' dulu supaya sendTo(hwid) menemukan koneksi
    await waitFor(hostEvents, (e) => e.kind === "join-request" && e.hwid === "HW-R");
    pairing.trackRequest({ hwid: "HW-R", deviceName: "Ditolak" });
    const res = pairing.reject({ hwid: "HW-R", reason: "Sudah cukup" });
    expect(res.ok).toBe(true);
    const msg = await waitFor(follower.messages, (m) => m.type === "rejected");
    expect(msg.reason).toBe("Sudah cukup");
    expect(pairing.listRequests().find((r) => r.hwid === "HW-R").status).toBe("rejected");
    follower.ws.close();
  });
});
