import { describe, expect, it, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { createHostServer } = require("./host-server.cjs");
const WebSocket = require("ws");

// ---------------------------------------------------------------------------
// Fase 1 — host-server: lifecycle + handshake + registry.
// Memakai port acak (0) supaya tidak bentrok di CI, lalu ambil port asli dari
// `status()` setelah server listening.
// ---------------------------------------------------------------------------

const HOST_ID = "HOSTTEST12345678";
let current = null;

function waitFor(ws, predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout menunggu pesan")), timeout);
    const onMsg = (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off("message", onMsg);
        resolve(msg);
      }
    };
    ws.on("message", onMsg);
  });
}

async function startServer(onEvent) {
  const server = createHostServer({ hostId: HOST_ID, port: 0, onEvent });
  const res = server.start();
  expect(res.ok).toBe(true);
  // Tunggu sampai server benar-benar listening (poll, maks ~1s).
  let st = server.status();
  for (let i = 0; i < 50 && !st.listening; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    st = server.status();
  }
  expect(st.listening).toBe(true);
  current = { server, port: st.port };
  return current;
}

afterEach(async () => {
  if (current) { await current.server.stop(); current = null; }
});

describe("host-server: lifecycle", () => {
  it("start mengembalikan port & status hosting=true", async () => {
    const { server, port } = await startServer();
    expect(port).toBeGreaterThan(0);
    expect(server.status().hosting).toBe(true);
  });

  it("stop menutup server (status hosting=false)", async () => {
    const { server } = await startServer();
    await server.stop();
    expect(server.status().hosting).toBe(false);
    current = null;
  });
});

describe("host-server: handshake", () => {
  it("emits join-request dan membalas hello-ack (accepted:false)", async () => {
    const events = [];
    const { port } = await startServer((evt) => events.push(evt));

    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve) => ws.on("open", resolve));
    const ackPromise = waitFor(ws, (m) => m.type === "hello-ack");
    ws.send(JSON.stringify({ type: "hello", hwid: "HW-1", deviceName: "Kasir 2" }));
    const ack = await ackPromise;

    expect(ack.accepted).toBe(false);
    expect(ack.hostId).toBe(HOST_ID);
    expect(events.some((e) => e.kind === "join-request" && e.hwid === "HW-1")).toBe(true);
    ws.close();
  });

  it("membalas ping dengan pong", async () => {
    const { port } = await startServer();
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve) => ws.on("open", resolve));
    const pongPromise = waitFor(ws, (m) => m.type === "pong");
    ws.send(JSON.stringify({ type: "ping" }));
    await pongPromise;
    ws.close();
  });

  it("emits follower-disconnected saat client putus", async () => {
    const events = [];
    const { port } = await startServer((evt) => events.push(evt));
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "hello", hwid: "HW-2", deviceName: "Kasir 3" }));
    await waitFor(ws, (m) => m.type === "hello-ack");
    ws.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(events.some((e) => e.kind === "follower-disconnected" && e.hwid === "HW-2")).toBe(true);
  });
});

describe("host-server: registry & approve", () => {
  it("status menampilkan follower terhubung, approveFollower mengubah ke active", async () => {
    const { server, port } = await startServer();
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    await new Promise((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "hello", hwid: "HW-3", deviceName: "Kasir 4" }));
    await waitFor(ws, (m) => m.type === "hello-ack");

    const followers = server.status().followers;
    expect(followers.find((f) => f.hwid === "HW-3")?.status).toBe("pending");

    const approvedPromise = waitFor(ws, (m) => m.type === "approved");
    const res = server.approveFollower("HW-3", "kasir-4");
    expect(res.ok).toBe(true);
    const msg = await approvedPromise;
    expect(msg.assignedUserId).toBe("kasir-4");
    expect(server.status().followers.find((f) => f.hwid === "HW-3")?.status).toBe("active");
    ws.close();
  });

  it("approveFollower gagal untuk device yang tidak terhubung", async () => {
    const { server } = await startServer();
    expect(server.approveFollower("TIDAK-ADA", "x").ok).toBe(false);
  });

  it("getGrantSecret null sebelum start, terisi setelah start", async () => {
    const fresh = createHostServer({ hostId: HOST_ID, port: 0, onEvent: () => {} });
    expect(fresh.getGrantSecret()).toBe(null);
    fresh.start();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(fresh.getGrantSecret()).toMatch(/^[0-9a-f]{64}$/);
    await fresh.stop();
  });
});

// ---------------------------------------------------------------------------
// Fase 4 — reserve-stock roundtrip (§5.1).
// ---------------------------------------------------------------------------

async function startServerWithReserve(handler, onEvent) {
  const server = createHostServer({ hostId: HOST_ID, port: 0, onEvent, onReserve: handler });
  server.start();
  let st = server.status();
  for (let i = 0; i < 50 && !st.listening; i++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    st = server.status();
  }
  current = { server, port: st.port };
  return current;
}

function connect(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  return new Promise((resolve) => ws.on("open", () => resolve(ws)));
}

describe("host-server: reserve-stock", () => {
  it("meneruskan request ke handler & membalas reserve-stock-result", async () => {
    const seen = [];
    const { port } = await startServerWithReserve((req) => {
      seen.push(req);
      return { ok: true, reserved: { a: 7 }, updatedAt: "T1" };
    });
    const ws = await connect(port);
    const resPromise = waitFor(ws, (m) => m.type === "reserve-stock-result");
    ws.send(JSON.stringify({ type: "reserve-stock", reqId: "r1", deltas: { a: -3 }, meta: { type: "sale" } }));
    const res = await resPromise;
    expect(res.reqId).toBe("r1");
    expect(res.ok).toBe(true);
    expect(res.reserved).toEqual({ a: 7 });
    expect(seen[0].deltas).toEqual({ a: -3 });
    ws.close();
  });

  it("meneruskan shortfall insufficient apa adanya", async () => {
    const { port } = await startServerWithReserve(() => ({
      ok: false, reason: "insufficient",
      shortfalls: [{ productId: "a", available: 1, needed: 5 }],
    }));
    const ws = await connect(port);
    const resPromise = waitFor(ws, (m) => m.type === "reserve-stock-result");
    ws.send(JSON.stringify({ type: "reserve-stock", reqId: "r2", deltas: { a: -5 } }));
    const res = await resPromise;
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("insufficient");
    expect(res.shortfalls[0].needed).toBe(5);
    ws.close();
  });

  it("tanpa handler → membalas unavailable (Client tidak menggantung)", async () => {
    const { port } = await startServerWithReserve(null);
    const ws = await connect(port);
    const resPromise = waitFor(ws, (m) => m.type === "reserve-stock-result");
    ws.send(JSON.stringify({ type: "reserve-stock", reqId: "r3", deltas: { a: -1 } }));
    const res = await resPromise;
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("unavailable");
    ws.close();
  });

  it("setReserveHandler memasang handler setelah start", async () => {
    const { server, port } = await startServerWithReserve(null);
    server.setReserveHandler(() => ({ ok: true, reserved: { z: 0 } }));
    const ws = await connect(port);
    const resPromise = waitFor(ws, (m) => m.type === "reserve-stock-result");
    ws.send(JSON.stringify({ type: "reserve-stock", reqId: "r4", deltas: { z: -1 } }));
    const res = await resPromise;
    expect(res.ok).toBe(true);
    ws.close();
  });

  it("handler yang throw → membalas error, bukan menggantung", async () => {
    const { port } = await startServerWithReserve(() => { throw new Error("db rusak"); });
    const ws = await connect(port);
    const resPromise = waitFor(ws, (m) => m.type === "reserve-stock-result");
    ws.send(JSON.stringify({ type: "reserve-stock", reqId: "r5", deltas: { a: -1 } }));
    const res = await resPromise;
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("error");
    expect(res.error).toBe("db rusak");
    ws.close();
  });
});
