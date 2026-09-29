#!/usr/bin/env node
// scripts/sign-request.mjs
//
// Membuat header HMAC yang SAMA dengan POS (`electron/device-sync-client.cjs`)
// untuk menguji Edge Function secara manual / smoke test.
//
// Pemakaian:
//   node scripts/sign-request.mjs --secret <deviceSecret> --device <deviceId> \
//        [--method POST] [--path /devices-register] [--body '<json>']
//
// Contoh (register):
//   node scripts/sign-request.mjs --secret abc123... --device dev_0123456789abcdef \
//        --path /devices-register \
//        --body '{"deviceId":"dev_0123456789abcdef","deviceName":"Test"}'
//
// Untuk GET /status, body default "{}" (konsisten dengan client POS).
//
// CATATAN: signingKey = sha256(device_secret), BUKAN secret mentah.
// `secretProof` (untuk register) = signingKey yang sama.

import crypto from "crypto";

function parseArgs(argv) {
  const out = { method: "POST", path: "/devices-register", body: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--secret") out.secret = argv[++i];
    else if (a === "--device") out.device = argv[++i];
    else if (a === "--method") out.method = argv[++i];
    else if (a === "--path") out.path = argv[++i];
    else if (a === "--body") out.body = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.secret || !args.device) {
  console.error("Pakai: node scripts/sign-request.mjs --secret <s> --device <dev_...> [--method M] [--path P] [--body JSON]");
  process.exit(1);
}

const signingKey = crypto.createHash("sha256").update(args.secret, "utf8").digest("hex");

// Body default "{}" agar konsisten dengan client POS.
let body = args.body;
if (body === undefined) {
  body = args.path.includes("/status") ? "{}" : JSON.stringify({ deviceId: args.device });
}

const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = crypto.randomBytes(12).toString("hex");
const signature = crypto
  .createHmac("sha256", signingKey)
  .update(`${timestamp}.${nonce}.${body}`)
  .digest("hex");

const headers = {
  "X-Device-ID": args.device,
  "X-Device-Timestamp": timestamp,
  "X-Device-Nonce": nonce,
  "X-Device-Signature": signature,
  "Content-Type": "application/json",
};

const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(" ");
const curl = `curl -X ${args.method} "$BASE${args.path}" ${headerArgs} --data-raw '${body}'`;

console.log(JSON.stringify({ method: args.method, path: args.path, secretProof: signingKey, headers, body, curl }, null, 2));
