/**
 * generator.js — KHUSUS PENJUAL, JANGAN INCLUDE DI FOLDER DISTRIBUSI
 *
 * Cara pakai:
 *   node generator.js AB12-CD34-EF56-7890
 *
 * Hardware ID didapat dari layar aktivasi di app pembeli.
 */

const crypto = require("crypto");

// ─── HARUS SAMA persis dengan LICENSE_SECRET di main.js ──────────────────────
const SECRET = "Q8x-7NqP-Z3mK-4VtR-8H2c-9wL6pX5sJ1";

function generateKey(hardwareId) {
  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(hardwareId.replace(/-/g, "").toUpperCase())
    .digest("hex")
    .toUpperCase();
  const s = hash.slice(0, 20);
  return `YKK-${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10, 15)}-${s.slice(15, 20)}`;
}

const hwid = process.argv[2];

if (!hwid) {
  console.log("");
  console.log("  ╔══════════════════════════════════════╗");
  console.log("  ║   YKK License Key Generator          ║");
  console.log("  ╚══════════════════════════════════════╝");
  console.log("");
  console.log("  Usage: node generator.js <HARDWARE_ID>");
  console.log("");
  console.log("  Contoh:");
  console.log("  node generator.js AB12-CD34-EF56-7890");
  console.log("");
  process.exit(1);
}

const key = generateKey(hwid);

console.log("");
console.log("  ╔══════════════════════════════════════╗");
console.log("  ║   YKK License Key Generator          ║");
console.log("  ╚══════════════════════════════════════╝");
console.log("");
console.log(`  Hardware ID  :  ${hwid.toUpperCase()}`);
console.log(`  License Key  :  ${key}`);
console.log("");
console.log("  Kirim License Key di atas ke pembeli.");
console.log("");
