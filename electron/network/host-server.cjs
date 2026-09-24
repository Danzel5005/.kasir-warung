// host-server.cjs — WebSocket server untuk Hosting mode (Fase 1 LAN sync).
//
// Dijalankan HANYA saat admin menekan "Mulai Hosting" dari Settings. Server
// menerima koneksi device non-admin (follower), menangani handshake, dan
// meneruskan event ke renderer Host lewat callback `emit` (dipakai main.cjs
// untuk `webContents.send`).
//
// Ruang lingkup Fase 1: lifecycle server + registry koneksi + ping/pong.
// Pairing/assign (Fase 3), reserve-stock (Fase 4) menyusul sebagai handler
// tambahan pada `messageHandlers` yang sama.

const { WebSocketServer } = require("ws");
const { createGrantSecret, signGrant } = require("./host-identity.cjs");

const PING_INTERVAL_MS = 15000;

function createHostServer({ hostId, port = 47474, onEvent = () => {} }) {
  let wss = null;
  let pingTimer = null;
  let listening = false;
  const clients = new Map(); // ws -> { hwid, deviceName, status, userId, lastSeen }
  let grantSecret = null;

  function broadcast(payload, filter = () => true) {
    const data = JSON.stringify(payload);
    for (const [ws, meta] of clients) {
      if (ws.readyState === ws.OPEN && filter(meta)) {
        try { ws.send(data); } catch (err) { console.warn("[Host] broadcast error:", err.message); }
      }
    }
  }

  function sendTo(hwid, payload) {
    const data = JSON.stringify(payload);
    for (const [ws, meta] of clients) {
      if (meta.hwid === hwid && ws.readyState === ws.OPEN) {
        try { ws.send(data); return true; } catch (_) { /* ignore */ }
      }
    }
    return false;
  }

  function handleMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    const meta = clients.get(ws);
    if (!meta) return;
    meta.lastSeen = Date.now();

    switch (msg.type) {
      case "hello": {
        meta.hwid = msg.hwid || null;
        meta.deviceName = msg.deviceName || "Perangkat";
        meta.status = "pending";
        onEvent({ kind: "join-request", hwid: meta.hwid, deviceName: meta.deviceName });
        ws.send(JSON.stringify({ type: "hello-ack", hostId, accepted: false, message: "Menunggu persetujuan Device A..." }));
        break;
      }
      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      // Fase 3/4 handlers (approve, reserve-stock, dll.) ditambahkan di sini.
      default:
        onEvent({ kind: "message", hwid: meta.hwid, msg });
        break;
    }
  }

  function start() {
    if (wss) return { ok: true, alreadyRunning: true, port };
    grantSecret = createGrantSecret();
    try {
      wss = new WebSocketServer({ port });
    } catch (err) {
      wss = null;
      return { ok: false, error: err.message };
    }

    wss.on("listening", () => {
      listening = true;
      console.log(`[Host] Hosting dimulai di port ${port} (hostId=${hostId})`);
      onEvent({ kind: "hosting-started", hostId, port });
    });
    wss.on("error", (err) => {
      console.warn("[Host] server error:", err.message);
      onEvent({ kind: "hosting-error", error: err.message });
    });
    wss.on("connection", (ws) => {
      clients.set(ws, { hwid: null, deviceName: null, status: "connecting", userId: null, lastSeen: Date.now() });
      ws.on("message", (raw) => handleMessage(ws, raw));
      ws.on("close", () => {
        const meta = clients.get(ws);
        clients.delete(ws);
        if (meta?.hwid) onEvent({ kind: "follower-disconnected", hwid: meta.hwid, deviceName: meta.deviceName });
      });
      ws.on("error", (err) => console.warn("[Host] client error:", err.message));
    });

    pingTimer = setInterval(() => {
      for (const [ws, meta] of clients) {
        if (Date.now() - meta.lastSeen > PING_INTERVAL_MS * 3) { try { ws.terminate(); } catch (_) { /* ignore */ } }
        else if (ws.readyState === ws.OPEN) { try { ws.send(JSON.stringify({ type: "ping" })); } catch (_) { /* ignore */ } }
      }
    }, PING_INTERVAL_MS);
    if (pingTimer.unref) pingTimer.unref();

    return { ok: true, port };
  }

  function stop() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    for (const [ws] of clients) { try { ws.close(); } catch (_) { /* ignore */ } }
    clients.clear();
    grantSecret = null;
    listening = false;
    return new Promise((resolve) => {
      if (!wss) return resolve({ ok: true });
      const server = wss;
      wss = null;
      try { server.close(() => resolve({ ok: true })); } catch { resolve({ ok: true }); }
    });
  }

  function status() {
    const followers = [];
    for (const [, meta] of clients) {
      if (meta.hwid) followers.push({ hwid: meta.hwid, deviceName: meta.deviceName, status: meta.status, userId: meta.userId });
    }
    // Kalau diminta port 0 (ephemeral), laporkan port asli yang dipakai OS.
    let activePort = port;
    try {
      const addr = wss && wss.address && wss.address();
      if (addr && typeof addr === "object" && addr.port) activePort = addr.port;
    } catch (_) { /* ignore */ }
    return { hosting: !!wss, listening, port: activePort, hostId, clientCount: clients.size, followers };
  }

  function approveFollower(hwid, userId) {
    for (const [ws, meta] of clients) {
      if (meta.hwid === hwid) {
        meta.status = "active";
        meta.userId = userId;
        // grantSignature: HMAC pakai secret sesi hosting, supaya Client tidak bisa
        // asal klaim "sudah di-approve" tanpa benar-benar lewat Device A (§3).
        const activatedAt = new Date().toISOString();
        const grantPayload = { hwid, hostId, assignedUserId: userId, activatedAt };
        const grantSignature = grantSecret ? signGrant(grantSecret, grantPayload) : null;
        try {
          ws.send(JSON.stringify({ type: "approved", hostId, assignedUserId: userId, activatedAt, grantSignature }));
        } catch (err) { console.warn("[Host] approve send error:", err.message); }
        return { ok: true, activatedAt, grantSignature };
      }
    }
    return { ok: false, error: "device tidak terhubung" };
  }

  return { start, stop, status, broadcast, sendTo, approveFollower, getGrantSecret: () => grantSecret };
}

module.exports = { createHostServer };
