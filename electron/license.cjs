const fs = require("fs");
const path = require("path");
const { generateKey } = require("./license-secret.cjs");

function getHardwareId() {
  try {
    const { machineIdSync } = require("node-machine-id");
    const raw = machineIdSync(true).replace(/-/g, "").toUpperCase().slice(0, 16);
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  } catch {
    return null;
  }
}

function createLicenseService(app) {
  const getLicensePath = () => path.join(app.getPath("userData"), ".ykk_lic");

  function checkLicense() {
    const hwid = getHardwareId();
    if (!hwid) return { valid: false, hardwareId: null, reason: "Gagal baca hardware ID" };
    try {
      const raw = fs.readFileSync(getLicensePath(), "utf8");
      const payload = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (generateKey(hwid) !== payload.key) return { valid: false, hardwareId: hwid, reason: "License tidak cocok" };
      return { valid: true, hardwareId: hwid, activatedAt: payload.activatedAt };
    } catch {
      return { valid: false, hardwareId: hwid, reason: "Belum diaktivasi" };
    }
  }

  function activateLicense(inputKey) {
    const hwid = getHardwareId();
    if (!hwid) return { ok: false, error: "Gagal baca hardware ID" };
    if (inputKey.trim().toUpperCase() !== generateKey(hwid))
      return { ok: false, error: "License key tidak valid untuk perangkat ini" };
    const payload = JSON.stringify({ key: inputKey.trim().toUpperCase(), hwid, activatedAt: new Date().toISOString() });
    fs.writeFileSync(getLicensePath(), Buffer.from(payload).toString("base64"), "utf8");
    return { ok: true };
  }

  return { checkLicense, activateLicense };
}

module.exports = { getHardwareId, createLicenseService };
