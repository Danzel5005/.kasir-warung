const https = require("https");
const http = require("http");

// `require("electron")` hanya valid di runtime Electron — di Node murni modul itu
// mengembalikan path string. Karena itu aksesnya lazy + dibungkus try/catch.
function electronAppVersion() {
  try {
    const electron = require("electron");
    if (electron?.app?.getVersion) return electron.app.getVersion();
  } catch { /* bukan runtime Electron */ }
  return null;
}

// Manifest kecil yang dicek:
// { "version": "1.2.0", "notes": "Perbaikan ...", "url": "https://.../download" }
const DEFAULT_MANIFEST_URL =
  process.env.KASIR_UPDATE_MANIFEST_URL ||
  "https://raw.githubusercontent.com/danzeltampilang/kasir-warung/main/updates/latest.json";

const TIMEOUT_MS = 6000;

function parseVersion(value) {
  return String(value ?? "")
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

// -1 bila a < b, 0 bila sama, 1 bila a > b.
function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function fetchJson(url, { timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const client = String(url).startsWith("http://") ? http : https;
    let settled = false;
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };
    const req = client.get(url, { headers: { "User-Agent": "kasir-warung-update-check" } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        done(reject, new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let body = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk) => {
        body += chunk;
        if (body.length > 64 * 1024) {
          req.destroy();
          done(reject, new Error("manifest terlalu besar"));
        }
      });
      res.on("end", () => {
        try {
          done(resolve, JSON.parse(body));
        } catch (err) {
          done(reject, err);
        }
      });
      res.on("error", (err) => done(reject, err));
    });
    req.setTimeout(timeout, () => {
      req.destroy();
      done(reject, new Error("timeout"));
    });
    req.on("error", (err) => done(reject, err));
  });
}

// Selalu resolve (tidak pernah throw) — aplikasi dipakai di warung yang
// sering tanpa internet, jadi kegagalan apa pun dianggap "tidak ada update".
async function checkForUpdate({
  url = DEFAULT_MANIFEST_URL,
  currentVersion,
  fetchImpl = fetchJson,
  getCurrentVersion = electronAppVersion,
} = {}) {
  const noUpdate = { hasUpdate: false, currentVersion: currentVersion || null, latestVersion: null, notes: null, url: null };
  try {
    const current = currentVersion || getCurrentVersion() || "0.0.0";
    const manifest = await fetchImpl(url);
    if (!manifest || typeof manifest.version !== "string") return { ...noUpdate, currentVersion: current };

    const hasUpdate = compareVersions(manifest.version, current) > 0;
    if (!hasUpdate) return { ...noUpdate, currentVersion: current, latestVersion: manifest.version };

    return {
      hasUpdate: true,
      currentVersion: current,
      latestVersion: manifest.version,
      notes: typeof manifest.notes === "string" ? manifest.notes : null,
      url: typeof manifest.url === "string" ? manifest.url : null,
    };
  } catch (err) {
    console.warn("[Update] Cek versi gagal (diabaikan):", err?.message || err);
    return noUpdate;
  }
}

module.exports = { checkForUpdate, compareVersions, parseVersion, DEFAULT_MANIFEST_URL };
