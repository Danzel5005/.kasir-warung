import { handlePreflight, json, fail } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifySignedRequest } from "../_shared/verify.ts";

// GET /devices-status/:deviceId
//
// POS memakai ini untuk polling pairing. Body tanda tangan = "{}" (POS mengirim
// JSON.stringify(body || {}) sehingga GET tetap punya payload "{}").
//
// Balikan: { paired, store_id, store_name, status }
//  - paired=true  → device punya store_id & status active
//  - paired=false → belum dipasangkan (pending) atau sudah di-revoke

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  // Body mentah untuk verifikasi signature. GET tidak punya body, dan POS
  // menandatangani atas "{}" — jadi samakan: kosong -> "{}".
  const rawBody = (await req.text()) || "{}";

  const url = new URL(req.url);
  // Path: /devices-status/<deviceId>  ATAU  /devices/:id/status (tergantung routing).
  const segments = url.pathname.split("/").filter(Boolean);
  const deviceId = decodeURIComponent(segments[segments.length - 1] || "");

  if (!/^dev_[0-9a-f]{16}$/.test(deviceId)) return fail("INVALID_DEVICE_ID", 400);

  // Header X-Device-ID harus cocok dengan path.
  if (req.headers.get("X-Device-ID") !== deviceId) {
    return fail("DEVICE_ID_MISMATCH", 400);
  }

  const verified = await verifySignedRequest(req, rawBody, {});
  if (!verified.ok) return fail(verified.error || "UNAUTHORIZED", verified.status || 401);

  const db = serviceClient();
  const { data: device, error } = await db
    .from("devices")
    .select("device_id, status, store_id, stores(name, status)")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) return fail("DB_ERROR", 500, { detail: error.message });
  if (!device) return fail("DEVICE_NOT_REGISTERED", 404);

  // Segarkan last_seen (polling = heartbeat pasif).
  await db.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("device_id", deviceId);

  const store = (device as { stores?: { name?: string; status?: string } | null }).stores || null;
  const paired = Boolean(device.store_id) && device.status === "active";

  return json({
    ok: true,
    paired,
    store_id: device.store_id || null,
    store_name: store?.name || null,
    status: device.status,
  });
});
