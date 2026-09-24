// host-license.cjs — penyimpanan grant aktivasi-via-host untuk Client (Fase 2–3).
//
// File `.ykk_hostlic` (TERPISAH dari `.ykk_lic`). Berisi grant dari Device A:
//   { hwid, hostId, assignedUserId, grantSignature, activatedAt }
//
// PENTING (Rule "preserve existing behavior"): modul ini TIDAK menyentuh
// `.ykk_lic`, `checkLicense`, atau `activateLicense`. Jalur aktivasi-via-host
// 100% paralel; device dengan license key standalone tidak terpengaruh.
//
// Sinkron: baca/tulis file kecil, tanpa network.

const fs = require("fs");
const path = require("path");

// Bentuk payload yang ditandatangani Host. Dipakai bersama host-identity.signGrant.
function buildGrantPayload({ hwid, hostId, assignedUserId, activatedAt }) {
  return { hwid, hostId, assignedUserId, activatedAt };
}

function createHostLicenseStore(app) {
  const getPath = () => {
    if (!app || typeof app.getPath !== "function") {
      throw new Error("app.getPath tidak tersedia");
    }
    return path.join(app.getPath("userData"), ".ykk_hostlic");
  };

  function read() {
    try {
      const raw = fs.readFileSync(getPath(), "utf8");
      const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (!payload || typeof payload !== "object") return null;
      if (!payload.hwid || !payload.hostId || !payload.grantSignature) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function write(grant) {
    if (!grant || !grant.hwid || !grant.hostId || !grant.grantSignature) {
      return { ok: false, error: "Grant tidak lengkap" };
    }
    try {
      const payload = JSON.stringify(grant);
      fs.writeFileSync(getPath(), Buffer.from(payload).toString("base64"), "utf8");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function clear() {
    try {
      if (fs.existsSync(getPath())) fs.unlinkSync(getPath());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Status ringan untuk startup: ada/tidaknya grant. Tidak memvalidasi signature
  // (itu tugas Host saat reconnect, §3 akhir).
  function status() {
    const grant = read();
    if (!grant) return { activated: false };
    return {
      activated: true,
      hostId: grant.hostId,
      assignedUserId: grant.assignedUserId,
      activatedAt: grant.activatedAt,
    };
  }

  return { read, write, clear, status, getPath };
}

module.exports = { createHostLicenseStore, buildGrantPayload };
