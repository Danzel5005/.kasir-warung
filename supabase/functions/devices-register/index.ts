import { corsHeaders, handlePreflight, json, fail } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sha256Hex, verifySignedRequest } from "../_shared/verify.ts";

// POST /devices-register
// Body: { deviceId, deviceName, platform?, appVersion?, secretProof? }
//
// Alur:
//   1. Verifikasi tanda tangan. Device baru belum ada di DB → `allowUnregistered`
//      + `keyOverride` = signing key yang diklaim di body.
//   2. Upsert device (status pending bila baru). Simpan credential_hash.
//   3. Buat pairing code (acak, disimpan sebagai hash), berlaku 10 menit.
//   4. Kembalikan pairing_code, expires_at, qr_payload.
//
// Idempoten: memanggil ulang akan membuat pairing code BARU (kode lama tetap
// valid sampai kedaluwarsa) dan menyegarkan nama device + last credential.

const PAIRING_TTL_MINUTES = 10;
// Alfabet tanpa karakter ambigu (0/O, 1/I/L).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

function generatePairingCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  // WAJIB: raw body (bukan req.json()) agar signature cocok.
  const rawBody = await req.text();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return fail("INVALID_JSON", 400);
  }

  const deviceId = String(body.deviceId || "").trim();
  if (!/^dev_[0-9a-f]{16}$/.test(deviceId)) return fail("INVALID_DEVICE_ID", 400);

  // Kandidat signing key: POS mengirim sha256(device_secret) sebagai proof.
  const claimedKey = String(body.secretProof || body.credentialHash || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(claimedKey)) return fail("INVALID_SECRET_PROOF", 400);

  // Verifikasi tanda tangan memakai kandidat key (device mungkin belum terdaftar).
  const verified = await verifySignedRequest(req, rawBody, {
    allowUnregistered: true,
    keyOverride: claimedKey,
  });
  if (!verified.ok) return fail(verified.error || "UNAUTHORIZED", verified.status || 401);

  const db = serviceClient();

  // Device yang sudah ada: kalau statusnya revoked, jangan diam-diam aktifkan.
  const { data: existing } = await db
    .from("devices")
    .select("device_id, status, credential_hash")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing?.status === "revoked" && existing.credential_hash !== claimedKey) {
    // Kredensial berbeda dari yang di-revoke → tolak (harus admin yang buka).
    return fail("DEVICE_REVOKED", 403);
  }

  const nowIso = new Date().toISOString();
  const upsertRow = {
    device_id: deviceId,
    device_name: String(body.deviceName || "Perangkat POS").slice(0, 120),
    credential_hash: claimedKey,
    last_seen_at: nowIso,
  };

  const { error: upsertErr } = await db
    .from("devices")
    .upsert(upsertRow, { onConflict: "device_id" });
  if (upsertErr) return fail("DB_UPSERT_FAILED", 500, { detail: upsertErr.message });

  // Buat pairing code baru.
  const code = generatePairingCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: codeErr } = await db.from("pairing_codes").insert({
    device_id: deviceId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });
  if (codeErr) return fail("DB_CODE_FAILED", 500, { detail: codeErr.message });

  return json({
    ok: true,
    deviceId,
    pairing_code: code,
    expires_at: expiresAt,
    qr_payload: `denpos://pair?code=${code}`,
  });
});
