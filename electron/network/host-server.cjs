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

// onReserve(request) -> Promise<{ ok, reserved?, reason?, shortfalls?, error? }>
// Disuntik dari network-service (stock-authority.cjs). Kalau tidak ada,
// reserve-stock dibalas dengan error supaya Client tidak menggantung.
function createHostServer({ hostId, port = 47474, onEvent = () => {}, onReserve = null, onTransaction = null, onEntity = null }) {
  let wss = null;
  let pingTimer = null;
  let listening = false;
  let reserveHandler = onReserve;
  const clients = new Map(); // ws -> { hwid, deviceName, status, userId, lastSeen }
  let grantSecret = null;

  function broadcast(payload, filter = () => true) {
    const data = JSON.stringify(payload);
    for (const [ws, meta] of clients) {
      if (meta.status === 'active' && ws.readyState === ws.OPEN && filter(meta)) {
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
    if (['reserve-stock', 'transaction', 'entity'].includes(msg.type) && meta.status !== 'active' && !(msg.type === 'reserve-stock' && typeof reserveHandler !== 'function')) {
      ws.send(JSON.stringify({ type: `${msg.type}-result`, reqId: msg.reqId, ok: false, reason: 'unauthorized' }));
      return;
    }

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
      case "reserve-stock": {
        // §5.1 — synchronous: Client menunggu balasan per permintaan.
        const reqId = msg.reqId || null;
        const reply = (payload) => {
          try { ws.send(JSON.stringify({ type: "reserve-stock-result", reqId, ...payload })); }
          catch (err) { console.warn("[Host] reserve reply error:", err.message); }
        };
        if (!reserveHandler) { reply({ ok: false, reason: "unavailable", error: "Host belum siap menerima reserve-stock" }); break; }
        // Bungkus dalam try + Promise.resolve supaya throw sinkron MAUPUN
        // reject async sama-sama dibalas sebagai {ok:false, reason:"error"} —
        // kalau tidak, throw sinkron lolos ke handler WS dan menjatuhkan Host.
        let pending;
        try {
          pending = Promise.resolve(reserveHandler({ hwid: meta.hwid, deltas: msg.deltas, meta: msg.meta }));
        } catch (err) {
          reply({ ok: false, reason: "error", error: err?.message || String(err) });
          break;
        }
        pending
          .then((res) => reply(res && typeof res === "object" ? res : { ok: false, reason: "error" }))
          .catch((err) => reply({ ok: false, reason: "error", error: err?.message || String(err) }));
        break;
      }
      case "entity":
      case "transaction": {
        const handler = msg.type === 'entity' ? onEntity : onTransaction;
        if (typeof handler !== "function") {
          ws.send(JSON.stringify({ type: `${msg.type}-result`, reqId: msg.reqId || null, ok: false, reason: "unavailable" }));
          break;
        }
        let pending;
        try { pending = Promise.resolve(handler({ hwid: meta.hwid, userId: meta.userId, trx: msg.trx, delta: msg.delta })); }
        catch (err) { pending = Promise.reject(err); }
        const reply = (res) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: `${msg.type}-result`, reqId: msg.reqId || null, ...res })); };
        pending.then((res) => reply(res || { ok: false }))
          .catch((err) => reply({ ok: false, error: err?.message || String(err) }));
        break;
      }
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

  function setReserveHandler(fn) { reserveHandler = typeof fn === "function" ? fn : null; }

  return { start, stop, status, broadcast, sendTo, approveFollower, setReserveHandler, getGrantSecret: () => grantSecret };
}

module.exports = { createHostServer };
