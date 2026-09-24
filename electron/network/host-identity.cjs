// host-identity.cjs — identitas Host untuk sinkronisasi LAN.
//
// PENTING (Rule "preserve existing behavior"): hostId SENGAJA memakai namespace
// hash terpisah dari license. Tidak membaca/menulis `.ykk_lic` dan tidak memanggil
// generateKey() — device yang lisensinya standalone tidak boleh terpengaruh sama
// sekali oleh fitur hosting ini.
//
// hostId = turunan node-machine-id, di-hash dengan prefix berbeda supaya:
//   - stabil antar restart (tidak berubah tiap launch),
//   - tidak pernah bertabrakan dengan HWID license (format/nilai beda).

const crypto = require("crypto");

function getRawMachineId() {
  try {
    const { machineIdSync } = require("node-machine-id");
    return machineIdSync(true).replace(/-/g, "").toUpperCase();
  } catch {
    return null;
  }
}

// hostId: 16 hex char, stabil per mesin, namespace "host".
function getHostId() {
  const raw = getRawMachineId();
  if (!raw) return null;
  const digest = crypto.createHash("sha256").update(`ykk-host-v1:${raw}`).digest("hex");
  return digest.slice(0, 16).toUpperCase();
}

// grantSignature: HMAC yang di-generate Host saat approve device, supaya Client
// tidak bisa asal klaim "sudah di-approve". Secret-nya cuma ada di sesi hosting
// Host (di-generate acak saat "Mulai Hosting", tidak pernah dikirim ke Client).
function createGrantSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function signGrant(secret, payload) {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

function verifyGrant(secret, payload, signature) {
  try {
    return signGrant(secret, payload) === signature;
  } catch {
    return false;
  }
}

module.exports = { getHostId, createGrantSecret, signGrant, verifyGrant };
