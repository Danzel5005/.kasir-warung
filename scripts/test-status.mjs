#!/usr/bin/env node
// scripts/test-status.mjs
//
// Diagnostik: memanggil devices-status dengan tanda tangan HMAC yang sama
// seperti POS, lalu mencetak respons mentah. Berguna untuk mencari tahu kenapa
// POS menganggap perangkat "belum dipasangkan".
//
// Pakai:
//   node scripts/test-status.mjs <deviceSecret> <deviceId> <baseUrl>

import crypto from "crypto";

const [, , secret, deviceId, baseUrl] = process.argv;
if (!secret || !deviceId || !baseUrl) {
  console.error("Pakai: node scripts/test-status.mjs <deviceSecret> <deviceId> <baseUrl>");
  process.exit(1);
}

const signingKey = crypto.createHash("sha256").update(secret, "utf8").digest("hex");
const body = "{}"; // sama seperti client POS untuk GET
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomBytes(12).toString("hex");
const signature = crypto
  .createHmac("sha256", signingKey)
  .update(`${timestamp}.${nonce}.${body}`)
  .digest("hex");

const url = `${baseUrl.replace(/\/+$/, "")}/devices-status/${encodeURIComponent(deviceId)}`;
console.log("GET", url);
console.log("X-Device-ID       :", deviceId);
console.log("X-Device-Timestamp:", timestamp);
console.log("X-Device-Nonce    :", nonce);
console.log("X-Device-Signature:", signature);
console.log("body              :", body);
console.log("---");

// CATATAN: GET tidak boleh punya body. Tanda tangan tetap atas "{}".
const res = await fetch(url, {
  method: "GET",
  headers: {
    "X-Device-ID": deviceId,
    "X-Device-Timestamp": timestamp,
    "X-Device-Nonce": nonce,
    "X-Device-Signature": signature,
    "Content-Type": "application/json",
  },
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
catch { console.log(text); }
