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

// createHostClient({ getHwid, deviceName, hostLicenseStore, onEvent, snapshotApplier })
//   onEvent(evt) — evt.kind: "connecting" | "connected" | "waiting" |
//                  "approved" | "rejected" | "snapshot" | "disconnected" | "error"
//   snapshotApplier(snapshot) — opsional; dipakai untuk menulis snapshot awal
//                  (menu/settings/open-bill) ke storage lokal Client. Kalau tidak
//                  ada, snapshot tetap di-emit supaya renderer bisa mengurusnya.
function createHostClient({ getHwid, deviceName = "DEN POS", hostLicenseStore, onEvent = () => {}, snapshotApplier = null }) {
  let ws = null;
  let target = null; // { host, port, hostId, name }
  let connectTimer = null;

  function cleanup() {
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
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
        onEvent({ kind: "approved", grant });
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
        onEvent({ kind: "snapshot", snapshot: msg.snapshot || {}, applied, sentAt: msg.sentAt });
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

    try {
      ws = new WebSocket(`ws://${target.host}:${target.port}`);
    } catch (err) {
      onEvent({ kind: "error", error: err.message });
      return { ok: false, error: err.message };
    }

    connectTimer = setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        onEvent({ kind: "error", error: "Koneksi ke Device A timeout" });
        cleanup();
      }
    }, CONNECT_TIMEOUT_MS);
    if (connectTimer.unref) connectTimer.unref();

    ws.on("open", () => {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      const hwid = getHwid();
      try {
        ws.send(JSON.stringify({ type: "hello", hwid, deviceName }));
      } catch (err) {
        onEvent({ kind: "error", error: err.message });
        return;
      }
      onEvent({ kind: "connected", hostId: target.hostId });
    });
    ws.on("message", handleMessage);
    ws.on("close", () => onEvent({ kind: "disconnected" }));
    ws.on("error", (err) => onEvent({ kind: "error", error: err.message }));

    return { ok: true };
  }

  function disconnect() {
    cleanup();
    target = null;
    return { ok: true };
  }

  function status() {
    return {
      connected: !!ws && ws.readyState === WebSocket.OPEN,
      connecting: !!ws && ws.readyState === WebSocket.CONNECTING,
      target,
    };
  }

  return { join, disconnect, status };
}

module.exports = { createHostClient, CONNECT_TIMEOUT_MS };
