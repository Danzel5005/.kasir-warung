#!/usr/bin/env node
// scripts/test-register.mjs
//
// Uji register TANPA risiko "body berubah" antara tanda tangan dan pengiriman:
// skrip ini membaca body.json, MENANDATANGANI, lalu LANGSUNG MENGIRIM.
// Karena satu proses, body dijamin identik.
//
// Pakai:
//   node scripts/test-register.mjs <secret> <deviceId> <baseUrl> [bodyFile]

import fs from "fs";
import crypto from "crypto";

const [, , secret, deviceId, baseUrl, bodyFile = "body.json"] = process.argv;

if (!secret || !deviceId || !baseUrl) {
  console.error("Pakai: node scripts/test-register.mjs <secret> <deviceId> <baseUrl> [bodyFile=body.json]");
  process.exit(1);
}

const rawBody = fs.readFileSync(bodyFile, "utf8");

// signingKey = sha256(secret) — HARUS sama dengan yang disimpan server (credential_hash).
const signingKey = crypto.createHash("sha256").update(secret, "utf8").digest("hex");

// Pastikan body memuat secretProof yang benar; kalau tidak, isi otomatis.
let bodyObj;
try { bodyObj = JSON.parse(rawBody); } catch (e) {
  console.error("body.json bukan JSON valid:", e.message);
  process.exit(1);
}
if (bodyObj.secretProof !== signingKey) {
  console.warn(`⚠️  secretProof di ${bodyFile} TIDAK cocok dengan sha256(secret).`);
  console.warn(`    secretProof di file : ${bodyObj.secretProof}`);
  console.warn(`    sha256(secret)      : ${signingKey}`);
  console.warn("    → body ditulis ulang otomatis dengan secretProof yang benar.\n");
  bodyObj.secretProof = signingKey;
}
if (!bodyObj.deviceId) bodyObj.deviceId = deviceId;
const finalBody = JSON.stringify(bodyObj);

const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomBytes(12).toString("hex");
const signature = crypto
  .createHmac("sha256", signingKey)
  .update(`${timestamp}.${nonce}.${finalBody}`)
  .digest("hex");

const url = `${baseUrl.replace(/\/+$/, "")}/devices-register`;
console.log("POST", url);
console.log("body     :", finalBody);
console.log("timestamp:", timestamp);
console.log("nonce    :", nonce);
console.log("signature:", signature);
console.log("---");

const res = await fetch(url, {
  method: "POST",
  headers: {
    "X-Device-ID": deviceId,
    "X-Device-Timestamp": timestamp,
    "X-Device-Nonce": nonce,
    "X-Device-Signature": signature,
    "Content-Type": "application/json",
  },
  body: finalBody,
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
catch { console.log(text); }
