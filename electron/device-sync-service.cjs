const fs = require("fs");
const path = require("path");

// ── Device sync service (IPC bridge) ────────────────────────────────────────
//
// Menyatukan `device-identity` (kredensial lokal) + `device-sync-client`
// (koneksi cloud) menjadi satu API IPC untuk renderer.
//
// PENTING: secret device TIDAK pernah dikirim mentah ke renderer kecuali
// diminta eksplisit lewat `device-credential` (alur pairing manual). Semua
// operasi jaringan berjalan di main process.

function createDeviceSyncService({ app, identity, client, configPath, fetchImpl } = {}) {
  if (!identity) throw new Error("createDeviceSyncService: identity wajib diisi");

  const resolveConfigPath = () =>
    configPath ||
    (app && typeof app.getPath === "function"
      ? path.join(app.getPath("userData"), "device-sync.json")
      : path.join(require("os").tmpdir(), "device-sync.json"));

  function readConfig() {
    try {
      return JSON.parse(fs.readFileSync(resolveConfigPath(), "utf8")) || {};
    } catch {
      return {};
    }
  }

  function writeConfig(patch) {
    const next = { ...readConfig(), ...patch };
    const file = resolveConfigPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
    fs.renameSync(tmp, file);
    return next;
  }

  // Client bisa disuntik (tes) atau dibangun lazy dari config tersimpan.
  let sync = client || null;
  let baseUrl = readConfig().baseUrl || "";
  if (sync && baseUrl) sync.setBaseUrl?.(baseUrl);

  function ensureClient() {
    if (sync) return sync;
    const { createDeviceSyncClient } = require("./device-sync-client.cjs");
    sync = createDeviceSyncClient({ identity, baseUrl, fetchImpl });
    return sync;
  }

  function getBaseUrl() {
    return baseUrl || readConfig().baseUrl || "";
  }

  function setBaseUrl(url) {
    baseUrl = typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";
    writeConfig({ baseUrl });
    if (sync) sync.setBaseUrl?.(baseUrl);
    return { ok: true, baseUrl };
  }

  /** Status lengkap untuk UI: identitas publik + URL + status pairing lokal. */
  function getStatus() {
    return {
      ok: true,
      identity: identity.getPublicIdentity(),
      baseUrl: getBaseUrl(),
      configured: Boolean(getBaseUrl()),
    };
  }

  /** Identitas aman untuk ditampilkan (tanpa secret). */
  function getIdentity() {
    return identity.getPublicIdentity();
  }

  /**
   * Kredensial untuk alur pairing manual. Mengembalikan secret karena user
   * memang butuh menyalin/memindainya — jangan pakai untuk polling rutin.
   */
  function getCredentialForPairing() {
    const cred = identity.getCredential();
    return { ok: true, deviceId: cred.deviceId, deviceSecret: cred.deviceSecret, deviceName: cred.deviceName };
  }

  async function register(opts = {}) {
    const c = ensureClient();
    const target = opts.baseUrl ? setBaseUrl(opts.baseUrl).baseUrl : getBaseUrl();
    if (!target) return { ok: false, error: "URL backend belum diatur" };
    const res = await c.register({ deviceName: opts.deviceName || identity.getDeviceName() });
    if (res.ok && res.storeId) identity.markRegistered(res.storeId);
    return res;
  }

  async function checkPairing(opts = {}) {
    const c = ensureClient();
    if (!getBaseUrl()) return { ok: false, error: "URL backend belum diatur" };
    const res = await c.getStatus(opts);
    if (res.ok) {
      if (res.paired && res.storeId) {
        if (!identity.isRegistered()) identity.markRegistered(res.storeId);
      } else if (!res.paired && identity.isRegistered()) {
        // Backend bilang belum paired -> sinkronkan status lokal (mis. di-revoke).
        identity.clearRegistration();
      }
    }
    return { ...res, identity: identity.getPublicIdentity() };
  }

  async function push(batch = {}) {
    const c = ensureClient();
    if (!getBaseUrl()) return { ok: false, error: "URL backend belum diatur" };
    if (!identity.isRegistered()) return { ok: false, error: "Perangkat belum dipasangkan" };
    return c.push(batch);
  }

  function rotateCredential() {
    // WAJIB dipasangkan ulang setelah rotate (deviceId berubah).
    const id = identity.rotate();
    return { ok: true, identity: identity.getPublicIdentity(), deviceId: id.deviceId };
  }

  function setDeviceName(name) {
    identity.setName(name);
    return { ok: true, identity: identity.getPublicIdentity() };
  }

  /**
   * Daftarkan semua handler IPC. Channel sengaja diberi prefix `device-`.
   * Return objek untuk keperluan tes / shutdown.
   */
  function registerHandlers(ipcMain) {
    if (!ipcMain || typeof ipcMain.handle !== "function") {
      throw new Error("registerHandlers: ipcMain tidak valid");
    }
    ipcMain.handle("device-identity", () => getIdentity());
    ipcMain.handle("device-status", () => getStatus());
    ipcMain.handle("device-set-base-url", (_e, url) => setBaseUrl(url));
    ipcMain.handle("device-register", (_e, opts) => register(opts || {}));
    ipcMain.handle("device-check-pairing", (_e, opts) => checkPairing(opts || {}));
    ipcMain.handle("device-push-sync", (_e, batch) => push(batch || {}));
    ipcMain.handle("device-credential", () => getCredentialForPairing());
    ipcMain.handle("device-rotate-credential", () => rotateCredential());
    ipcMain.handle("device-set-name", (_e, name) => setDeviceName(name));
    return { getStatus, getIdentity, register, checkPairing, push };
  }

  return {
    getStatus,
    getIdentity,
    getCredentialForPairing,
    getBaseUrl,
    setBaseUrl,
    register,
    checkPairing,
    push,
    rotateCredential,
    setDeviceName,
    registerHandlers,
  };
}

module.exports = { createDeviceSyncService };
