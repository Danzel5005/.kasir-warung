// host-client.cjs — konektor WebSocket sisi Client (Fase 2 LAN sync).
//
// Client (device non-admin yang belum punya License Key) memakai modul ini untuk:
//   1. connect ke Host yang ditemukan via mDNS (discovery.browse),
//   2. kirim `hello {hwid, deviceName}` (Host memetakan ini jadi join-request),
//   3. menunggu balasan `approved {hostId, assignedUserId, grantSignature}` dari Host,
//   4. menyimpan grant ke `.ykk_hostlic` (lewat hostLicenseStore, disuntik dari luar).
//
// Ruang lingkup Fase 2: connect + hello + terima approved/hello-ack. Reconnect
// otomatis & re-validate saat startup masuk Fase 3.

const WebSocket = require("ws");
const { buildGrantPayload } = require("./host-license.cjs");

const CONNECT_TIMEOUT_MS = 8000;
const RESERVE_TIMEOUT_MS = 5000;

// createHostClient({ getHwid, deviceName, hostLicenseStore, onEvent, snapshotApplier })
//   onEvent(evt) — evt.kind: "connecting" | "connected" | "waiting" |
//                  "approved" | "rejected" | "snapshot" | "disconnected" | "error"
//   snapshotApplier(snapshot) — opsional; dipakai untuk menulis snapshot awal
//                  (menu/settings/open-bill) ke storage lokal Client. Kalau tidak
//                  ada, snapshot tetap di-emit supaya renderer bisa mengurusnya.
//   deltaApplier(rows) — opsional; dipakai saat Host mem-broadcast delta stok
//                  ({productId, newStock, updatedAt}[]) ke Client (§5.2).
function createHostClient({ getHwid, deviceName = "DEN POS", hostLicenseStore, onEvent = () => {}, snapshotApplier = null, deltaApplier = null }) {
  let ws = null;
  let target = null; // { host, port, hostId, name }
  let connectTimer = null;
  let pendingGrant = null;
  let reqSeq = 0;
  const pendingReserves = new Map(); // reqId -> { resolve, timer }

  function settleReserve(reqId, payload) {
    const pending = pendingReserves.get(reqId);
    if (!pending) return;
    pendingReserves.delete(reqId);
    if (pending.timer) clearTimeout(pending.timer);
    pending.resolve(payload);
  }

  function cleanup() {
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
    pendingGrant = null;
    // Gagalkan semua reserve yang masih menunggu (koneksi putus).
    for (const [reqId, pending] of pendingReserves) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.resolve({ ok: false, reason: "disconnected" });
      pendingReserves.delete(reqId);
    }
    if (ws) {
      try { ws.removeAllListeners(); ws.close(); } catch (_) { /* ignore */ }
      ws = null;
    }
  }

  function handleMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    switch (msg.type) {
      case "hello-ack":
        onEvent({ kind: "waiting", hostId: msg.hostId, message: msg.message || "Menunggu persetujuan Device A..." });
        break;
      case "approved": {
        const hwid = getHwid();
        // PENTING: pakai activatedAt dari Host (bukan waktu lokal) supaya payload
        // yang ditandatangani Host tetap bisa diverifikasi ulang saat reconnect (§3).
        const activatedAt = msg.activatedAt || new Date().toISOString();
        const payload = buildGrantPayload({
          hwid,
          hostId: msg.hostId || (target && target.hostId),
          assignedUserId: msg.assignedUserId,
          activatedAt,
        });
        const grant = { ...payload, grantSignature: msg.grantSignature || null };
        if (hostLicenseStore && grant.grantSignature) hostLicenseStore.write(grant);
        pendingGrant = grant;
        break;
      }
      case "rejected":
        onEvent({ kind: "rejected", reason: msg.reason || "Ditolak Device A" });
        break;
      case "snapshot": {
        // Snapshot awal dikirim SEKALI saat Host approve (plan §3 langkah 8).
        // Terapkan ke storage lokal dulu (kalau applier tersedia) supaya Client
        // langsung punya menu/kasir/open-bill, lalu teruskan ke renderer.
        let applied = false;
        if (snapshotApplier && msg.snapshot) {
          try { snapshotApplier(msg.snapshot); applied = true; }
          catch (err) { console.warn("[Client] snapshotApplier error:", err?.message || err); }
        }
        const { users: _credentials, ...safeSnapshot } = msg.snapshot || {};
        onEvent({ kind: "snapshot", snapshot: safeSnapshot, applied, sentAt: msg.sentAt });
        if (pendingGrant) {
          onEvent({ kind: "approved", grant: pendingGrant });
          pendingGrant = null;
        }
        break;
      }
      case "reserve-stock-result":
        settleReserve(msg.reqId, msg);
        break;
      case "stock-delta": {
        // §5.2 — Host hanya mengirim baris yang berubah.
        const rows = Array.isArray(msg.rows) ? msg.rows : [];
        let applied = false;
        if (deltaApplier && rows.length) {
          try { deltaApplier(rows); applied = true; }
          catch (err) { console.warn("[Client] deltaApplier error:", err?.message || err); }
        }
        onEvent({ kind: "stock-delta", rows, applied });
        break;
      }
      case "ping":
        try { ws && ws.send(JSON.stringify({ type: "pong" })); } catch (_) { /* ignore */ }
        break;
      default:
        onEvent({ kind: "message", msg });
        break;
    }
  }

  function join(hostInfo) {
    cleanup();
    if (!hostInfo || !hostInfo.host) {
      onEvent({ kind: "error", error: "Host tidak valid" });
      return { ok: false, error: "Host tidak valid" };
    }
    target = {
      host: hostInfo.host,
      port: hostInfo.port || 47474,
      hostId: hostInfo.hostId || null,
      name: hostInfo.name || null,
    };
    onEvent({ kind: "connecting", target });

    const candidates = [...new Set([target.host, ...(hostInfo.addresses || [])])]
      .filter(Boolean);
    let candidateIndex = 0;

    const tryNext = () => {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      if (ws) { try { ws.removeAllListeners(); ws.terminate(); } catch (_) { /* ignore */ } ws = null; }
      const address = candidates[candidateIndex++];
      if (!address) {
        onEvent({ kind: "error", error: "Koneksi ke Device A timeout" });
        return;
      }
      const socketHost = String(address).includes(":") ? `[${address}]` : address;
      try { ws = new WebSocket(`ws://${socketHost}:${target.port}`); }
      catch (_) { tryNext(); return; }

      connectTimer = setTimeout(tryNext, Math.max(2000, Math.floor(CONNECT_TIMEOUT_MS / candidates.length)));
      if (connectTimer.unref) connectTimer.unref();
      const onConnectError = () => tryNext();
      ws.once("open", () => {
        if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
        ws.removeListener("error", onConnectError);
        ws.on("error", (err) => onEvent({ kind: "error", error: err.message }));
        const hwid = getHwid();
        try { ws.send(JSON.stringify({ type: "hello", hwid, deviceName })); }
        catch (err) { onEvent({ kind: "error", error: err.message }); return; }
        onEvent({ kind: "connected", hostId: target.hostId });
      });
      ws.on("message", handleMessage);
      ws.once("error", onConnectError);
      ws.on("close", () => onEvent({ kind: "disconnected" }));
    };
    tryNext();

    return { ok: true };
  }

  function disconnect() {
    cleanup();
    target = null;
    onEvent({ kind: "disconnected" });
    return { ok: true };
  }

  // §5.1 — reserve-stock synchronous. Mengembalikan Promise yang resolve
  // dengan balasan Host ({ok, reserved,...}) atau {ok:false, reason:"offline"}
  // kalau Client tidak terhubung. Renderer menampilkan state loading saat ini.
  function reserveStock(deltas, meta) {
    return new Promise((resolve) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        onEvent({ kind: "reserve-offline" });
        resolve({ ok: false, reason: "offline" });
        return;
      }
      const reqId = `rs-${++reqSeq}-${Date.now()}`;
      const timer = setTimeout(() => {
        pendingReserves.delete(reqId);
        onEvent({ kind: "reserve-timeout" });
        resolve({ ok: false, reason: "timeout" });
      }, RESERVE_TIMEOUT_MS);
      if (timer.unref) timer.unref();
      pendingReserves.set(reqId, { resolve, timer });
      try {
        ws.send(JSON.stringify({ type: "reserve-stock", reqId, deltas, meta: meta || {} }));
      } catch (err) {
        settleReserve(reqId, { ok: false, reason: "error", error: err.message });
      }
    });
  }

  function sendTransaction(trx) {
    return new Promise((resolve) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return resolve({ ok: false, reason: "offline" });
      const reqId = `tx-${++reqSeq}-${Date.now()}`;
      const timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), RESERVE_TIMEOUT_MS);
      if (timer.unref) timer.unref();
      const done = (msg) => { clearTimeout(timer); ws?.off("message", listener); resolve(msg); };
      const listener = (raw) => { try { const msg = JSON.parse(raw.toString()); if (msg.type === "transaction-result" && msg.reqId === reqId) done(msg); } catch {} };
      ws.on("message", listener);
      try { ws.send(JSON.stringify({ type: "transaction", reqId, trx })); } catch (err) { done({ ok: false, error: err.message }); }
    });
  }

  function status() {
    return {
      connected: !!ws && ws.readyState === WebSocket.OPEN,
      connecting: !!ws && ws.readyState === WebSocket.CONNECTING,
      target,
    };
  }

  return { join, disconnect, status, reserveStock, sendTransaction };
}

module.exports = { createHostClient, CONNECT_TIMEOUT_MS, RESERVE_TIMEOUT_MS };
