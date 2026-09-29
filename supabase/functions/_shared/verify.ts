import { serviceClient } from "./supabase.ts";

// ── Verifikasi kredensial perangkat (HMAC) ──────────────────────────────────
//
// SKEMA (kesepakatan POS ↔ server):
//   device_secret  = rahasia milik POS, TIDAK pernah dikirim ke server.
//   signing key    = hexLower(sha256(device_secret))   ← inilah kunci HMAC
//   credential_hash (disimpan server) = signing key tsb.
//
//   signedString = `${timestamp}.${nonce}.${rawBody}`
//   signature    = hex(HMAC-SHA256(signingKey, signedString))
//
// Dengan skema ini server bisa memverifikasi HMAC tanpa menyimpan secret
// plaintext: yang disimpan adalah signingKey, bukan secret.
//
// PENTING soal body: `rawBody` = string body MENTAH (`await req.text()`).
// Jangan `req.json()` lalu stringify ulang. Untuk GET/status tanpa body, POS
// tetap mengirim "{}" (lihat `JSON.stringify(body || {})` di client).

interface DeviceRow {
  device_id: string;
  device_name: string | null;
  credential_hash: string;
  status: string;
  store_id: string | null;
}

export interface VerifyResult {
  ok: boolean;
  device?: DeviceRow;
  error?: string;
  status?: number;
}

const MAX_SKEW_SECONDS = 300;

/** sha256 hex (lowercase). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256 hex dengan kunci string. */
export async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Perbandingan string konstan-waktu. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface VerifyOptions {
  /**
   * Device baru belum ada di DB. Dipakai hanya oleh devices-register:
   * server tidak melakukan lookup device, dan `keyOverride` wajib diisi dengan
   * kandidat signing key (= credential_hash dari body register).
   */
  allowUnregistered?: boolean;
  /** Kandidat signing key saat register (belum tersimpan di DB). */
  keyOverride?: string;
}

/**
 * Verifikasi request ber-tanda-tangan. Return `{ ok, device?, error?, status? }`.
 * Tidak pernah melempar untuk input yang buruk.
 */
export async function verifySignedRequest(
  req: Request,
  rawBody: string,
  opts: VerifyOptions = {},
): Promise<VerifyResult> {
  const deviceId = req.headers.get("X-Device-ID");
  const ts = req.headers.get("X-Device-Timestamp");
  const nonce = req.headers.get("X-Device-Nonce");
  const signature = req.headers.get("X-Device-Signature");

  if (!deviceId || !ts || !nonce || !signature) {
    return { ok: false, status: 400, error: "MISSING_DEVICE_HEADERS" };
  }

  // Skew timestamp (cegah replay lama).
  const nowSec = Math.floor(Date.now() / 1000);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "TIMESTAMP_OUT_OF_RANGE" };
  }

  const db = serviceClient();

  // Tentukan kunci verifikasi.
  let key = opts.keyOverride ?? "";
  let device: DeviceRow | undefined;

  if (!opts.allowUnregistered) {
    const { data, error } = await db
      .from("devices")
      .select("device_id, device_name, credential_hash, status, store_id")
      .eq("device_id", deviceId)
      .maybeSingle<DeviceRow>();
    if (error) return { ok: false, status: 500, error: "DB_ERROR" };
    if (!data) return { ok: false, status: 404, error: "DEVICE_NOT_REGISTERED" };
    if (data.status === "revoked") return { ok: false, status: 403, error: "DEVICE_REVOKED" };
    device = data;
    key = data.credential_hash;
  } else if (!key) {
    return { ok: false, status: 400, error: "MISSING_KEY_OVERRIDE" };
  }

  const expected = await hmacHex(key, `${ts}.${nonce}.${rawBody}`);
  if (!safeEqual(expected, signature)) {
    return { ok: false, status: 401, error: "BAD_SIGNATURE" };
  }

  // Anti-replay: catat nonce; bentrok primary key = nonce dipakai ulang.
  const { error: nonceErr } = await db
    .from("device_nonces")
    .insert({ device_id: deviceId, nonce });
  if (nonceErr) {
    return { ok: false, status: 409, error: "NONCE_REPLAY" };
  }

  return { ok: true, device };
}
