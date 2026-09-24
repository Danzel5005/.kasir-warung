// network-service.cjs — orkestrator hosting LAN (Fase 1).
//
// Menyatukan WebSocket server (host-server) + mDNS advertise/browse (discovery),
// dan mendaftarkan IPC handler yang dipakai renderer:
//   - hosting-start / hosting-stop / hosting-status
//   - discovery-browse-start / discovery-browse-stop (untuk modal Client)
//
// Event dari follower diteruskan ke renderer lewat `emit` (webContents.send),
// supaya UI Host bisa menampilkan daftar pending join-request secara live.

const { getHostId } = require("./host-identity.cjs");
const { createHostServer } = require("./host-server.cjs");
const { createDiscovery } = require("./discovery.cjs");
const { createHostClient } = require("./host-client.cjs");
const { createHostLicenseStore } = require("./host-license.cjs");
const { createPairing } = require("./pairing.cjs");
const { getHardwareId } = require("../license.cjs");

const DEFAULT_PORT = 47474;

function createNetworkService({ ipcMain, app, emit = () => {}, discoveryFactory = createDiscovery, snapshotProvider = () => ({}), getUsers = () => [], clientSnapshotApplier = null }) {
  const hostId = getHostId();
  let deviceName = "DEN POS";
  let port = DEFAULT_PORT;

  // ── Fase 3: pairing (assign akun + snapshot awal) ──────────────────────
  // Pairing perlu hostServer yang sudah jadi, tapi hostServer perlu emit yang
  // meneruskan `join-request` ke pairing. Kita rangkai lewat referensi (let)
  // supaya tidak ada siklus konstruksi.
  let pairing = null;

  // Store grant aktivasi-via-host (`.ykk_hostlic`). Hanya dibuat kalau `app`
  // tersedia (dibutuhkan getPath). Di test, store disuntik lewat hostLicenseStore.
  const hostLicenseStore = app ? createHostLicenseStore(app) : null;

  const hostServer = createHostServer({
    hostId,
    port,
    onEvent: (evt) => {
      // Teruskan join-request/disconnect ke pairing supaya daftar pending pada
      // Host UI tetap sinkron, lalu ke renderer sebagai event live.
      if (evt?.kind === "join-request" && pairing) pairing.trackRequest({ hwid: evt.hwid, deviceName: evt.deviceName });
      if (evt?.kind === "follower-disconnected" && pairing) pairing.forget(evt.hwid);
      emit("hosting:event", evt);
    },
  });

  pairing = createPairing({
    hostServer,
    getUsers,
    buildSnapshot: snapshotProvider,
    onEvent: (evt) => emit("hosting:event", evt),
  });

  const discovery = discoveryFactory({ hostId, deviceName, port });

  // Client-side connector (Fase 2). getHwid memakai license.getHardwareId() —
  // BACA-SAJA identitas, tidak menyentuh `.ykk_lic`.
  const hostClient = createHostClient({
    getHwid: () => getHardwareId(),
    deviceName,
    hostLicenseStore,
    snapshotApplier: clientSnapshotApplier,
    onEvent: (evt) => emit("client:event", evt),
  });

  function registerHandlers() {
    ipcMain.handle("hosting-start", async (_e, { name, port: requestedPort } = {}) => {
      if (!hostId) return { ok: false, error: "Gagal baca identitas perangkat" };
      if (name) deviceName = String(name);
      if (requestedPort && Number(requestedPort) !== port) port = Number(requestedPort);
      const res = hostServer.start();
      if (!res.ok) return res;
      discovery.advertise({ hostName: deviceName, port });
      return { ok: true, hostId, port, name: deviceName };
    });

    ipcMain.handle("hosting-stop", async () => {
      discovery.stopAdvertise();
      await hostServer.stop();
      return { ok: true };
    });

    ipcMain.handle("hosting-status", () => ({ hostId, ...hostServer.status() }));

    // Client-side discovery (dipakai modal "Aktifkan via Device Lain").
    let stopBrowse = null;
    ipcMain.handle("discovery-browse-start", (_e, { name } = {}) => {
      if (stopBrowse) { stopBrowse(); stopBrowse = null; }
      if (name) deviceName = String(name);
      stopBrowse = discovery.browse((hosts) => emit("discovery:hosts", hosts));
      return { ok: true };
    });
    ipcMain.handle("discovery-browse-stop", () => {
      if (stopBrowse) { stopBrowse(); stopBrowse = null; }
      return { ok: true };
    });

    // ── Fase 2: Client join / aktivasi-via-host ────────────────────────────
    ipcMain.handle("client-join", (_e, hostInfo) => {
      if (!hostInfo || !hostInfo.host) return { ok: false, error: "Host tidak valid" };
      return hostClient.join(hostInfo);
    });
    ipcMain.handle("client-disconnect", () => hostClient.disconnect());
    ipcMain.handle("client-status", () => hostClient.status());
    ipcMain.handle("host-license-status", () => (hostLicenseStore ? hostLicenseStore.status() : { activated: false }));
    ipcMain.handle("host-license-clear", () => (hostLicenseStore ? hostLicenseStore.clear() : { ok: false, error: "tidak tersedia" }));

    // ── Fase 3: pairing (Host) — assign akun + push snapshot awal ──────────
    ipcMain.handle("pairing-list", () => ({ ok: true, requests: pairing.listRequests() }));
    ipcMain.handle("pairing-assignable-users", () => {
      try { return { ok: true, users: pairing.listAssignableUsers(getUsers()) }; }
      catch (err) { return { ok: false, error: err.message, users: [] }; }
    });
    ipcMain.handle("pairing-approve", async (_e, { hwid, userId } = {}) => pairing.approve({ hwid, userId }));
    ipcMain.handle("pairing-reject", (_e, { hwid, reason } = {}) => pairing.reject({ hwid, reason }));
  }

  function shutdown() {
    discovery.destroy();
    hostClient.disconnect();
    return hostServer.stop();
  }

  return { registerHandlers, shutdown, getHostId: () => hostId, hostServer, hostClient, hostLicenseStore, pairing };
}

module.exports = { createNetworkService, DEFAULT_PORT };
