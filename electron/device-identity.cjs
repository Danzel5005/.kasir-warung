const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

// ── Device identity untuk cloud sync (PLAN-WEBSYNC §"Software POS") ─────────
//
// Software POS bertindak sebagai *sync client*. Ia memiliki identitas sendiri
// yang TIDAK boleh diubah dari browser/renderer:
//
//   device_id      — ID publik (boleh dikirim/di-share, aman dipalsukan)
//   device_secret  — kredensial RAHASIA, HMAC key untuk menandatangani request
//
// Secret disimpan di userData (satu level di atas folder `data/`) dan tidak
// pernah dikirim ke renderer. `getPublicIdentity()` sengaja mengosongkan field
// secret, dan IPC `device-credential` hanya mengembalikan secret untuk alur
// *pairing* eksplisit (one-time), bukan untuk pembacaan rutin.
//
// File format (base64 JSON):
//   { deviceId, deviceSecret, deviceName, createdAt }

const DEVICE_ID_PREFIX = "dev_";
const SECRET_BYTES = 32; // 256-bit HMAC key

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function generateDeviceId() {
  return DEVICE_ID_PREFIX + randomHex(8); // 16 hex chars -> dev_xxxxxxxxxxxxxxxx
}

function generateDeviceSecret() {
  return randomHex(SECRET_BYTES);
}

function defaultDeviceName() {
  let host = "perangkat";
  try {
    host = os.hostname() || host;
  } catch {
    /* ignore — hostname is best-effort */
  }
  // Nama perangkat yang ramah dibaca admin di web-app: "DEN POS — <hostname>"
  return `DEN POS — ${host}`;
}

function normalizeName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed ? trimmed.slice(0, 80) : defaultDeviceName();
}

function createDeviceIdentity({ app, secretPath } = {}) {
  const filePath =
    secretPath ||
    (app && typeof app.getPath === "function"
      ? path.join(app.getPath("userData"), ".pos_device")
      : path.join(os.tmpdir(), ".pos_device"));

  function read() {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (!payload || typeof payload.deviceId !== "string" || typeof payload.deviceSecret !== "string") {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function write(payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    // Tulis atomik: temp lalu rename, supaya credential tidak pernah setengah tertulis.
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, encoded, "utf8");
    fs.renameSync(tmp, filePath);
    return payload;
  }

  /**
   * Pastikan identitas ada. Kredensial dibuat sekali seumur instalasi dan
   * tidak pernah diregenerasi otomatis (regenerasi hanya lewat `rotate`).
   */
  function ensure() {
    const existing = read();
    if (existing) return existing;
    return write({
      deviceId: generateDeviceId(),
      deviceSecret: generateDeviceSecret(),
      deviceName: defaultDeviceName(),
      createdAt: new Date().toISOString(),
    });
  }

  /** Identitas tanpa rahasia — aman dikirim ke renderer / ditampilkan di UI. */
  function getPublicIdentity() {
    const id = ensure();
    return {
      deviceId: id.deviceId,
      deviceName: id.deviceName,
      createdAt: id.createdAt,
      registered: Boolean(id.storeId),
      storeId: id.storeId || null,
      lastRegisteredAt: id.lastRegisteredAt || null,
    };
  }

  /**
   * Kredensial lengkap (termasuk secret). HANYA dipakai oleh sync client di
   * main process dan oleh alur pairing. Jangan expose hasil mentahnya ke UI.
   */
  function getCredential() {
    const id = ensure();
    return {
      deviceId: id.deviceId,
      deviceSecret: id.deviceSecret,
      deviceName: id.deviceName,
    };
  }

  function getDeviceId() {
    return ensure().deviceId;
  }

  function getSecret() {
    return ensure().deviceSecret;
  }

  function getDeviceName() {
    return ensure().deviceName;
  }

  function setName(name) {
    const id = ensure();
    return write({ ...id, deviceName: normalizeName(name) });
  }

  function isRegistered() {
    return Boolean(read()?.storeId);
  }

  /** Dipanggil setelah backend mengonfirmasi store/device terpasangkan. */
  function markRegistered(storeId) {
    const id = ensure();
    return write({ ...id, storeId: storeId || null, lastRegisteredAt: new Date().toISOString() });
  }

  function clearRegistration() {
    const id = ensure();
    const next = { ...id, lastRegisteredAt: new Date().toISOString() };
    delete next.storeId;
    return write(next);
  }

  /**
   * Regenerasi credential (dipakai admin untuk "revoke lalu pasangkan ulang").
   * deviceId ikut berubah sehingga pairing code lama tidak berlaku lagi.
   */
  function rotate() {
    const prev = read();
    return write({
      deviceId: generateDeviceId(),
      deviceSecret: generateDeviceSecret(),
      deviceName: prev?.deviceName || defaultDeviceName(),
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Hitung signature HMAC-SHA256(secret, canonical payload).
   * `payload` boleh object (di-canonicalize agar deterministik) atau string.
   */
  function sign(payload) {
    const body = typeof payload === "string" ? payload : canonicalize(payload);
    return crypto.createHmac("sha256", getSecret()).update(body).digest("hex");
  }

  /** Verifikasi signature yang diterima (timing-safe). */
  function verify(payload, signature) {
    if (typeof signature !== "string" || !signature) return false;
    const expected = sign(payload);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  return {
    getPath: () => filePath,
    ensure,
    read,
    getPublicIdentity,
    getCredential,
    getDeviceId,
    getSecret,
    getDeviceName,
    setName,
    isRegistered,
    markRegistered,
    clearRegistration,
    rotate,
    sign,
    verify,
  };
}

/** Canonical JSON: key diurutkan agar HMAC sama untuk isi yang sama. */
function canonicalize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
}

module.exports = {
  createDeviceIdentity,
  generateDeviceId,
  generateDeviceSecret,
  defaultDeviceName,
  canonicalize,
  DEVICE_ID_PREFIX,
};
