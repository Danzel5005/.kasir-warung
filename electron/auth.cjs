const crypto = require("crypto");

// Format tersimpan: "scrypt:<salt-hex>:<hash-hex>"
// Memakai hanya modul `crypto` bawaan Node sehingga tidak menambah dependency.
const PREFIX = "scrypt:";
const SALT_BYTES = 16;
const KEY_LEN = 64;

function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(String(plain), salt, KEY_LEN).toString("hex");
  return `${PREFIX}${salt}:${hash}`;
}

// Mengembalikan true bila `plain` cocok dengan `stored`.
// - Nilai lama (plaintext, tanpa prefix) tetap diterima agar migrasi bisa "lazy".
// - Panjang hash berbeda tidak boleh melempar (timingSafeEqual butuh panjang sama).
function verifyPassword(plain, stored) {
  if (typeof plain !== "string" || typeof stored !== "string" || stored.length === 0) return false;
  if (!stored.startsWith(PREFIX)) return false;

  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  if (expectedHex.length !== KEY_LEN * 2) return false;

  let actual;
  try {
    actual = crypto.scryptSync(plain, salt, KEY_LEN).toString("hex");
  } catch {
    return false;
  }

  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expectedHex, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Verifikasi dengan fallback plaintext untuk data lama (users.json versi lama).
function verifyPasswordWithLegacy(plain, stored) {
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  if (stored.startsWith(PREFIX)) return verifyPassword(plain, stored);
  // Perbandingan panjang-tetap untuk menghindari kebocoran waktu sederhana.
  const a = Buffer.from(plain, "utf-8");
  const b = Buffer.from(stored, "utf-8");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return plain === stored;
  }
}

function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}

module.exports = { hashPassword, verifyPassword, verifyPasswordWithLegacy, isHashed, PREFIX };
