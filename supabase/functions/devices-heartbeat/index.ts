import { handlePreflight, json, fail } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifySignedRequest } from "../_shared/verify.ts";

// POST /devices-heartbeat
// Body: { deviceId, at }
// Menandai device online. Ringan — tidak dipakai untuk polling pairing
// (itu tugas devices-status).

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  const rawBody = await req.text();

  const verified = await verifySignedRequest(req, rawBody, {});
  if (!verified.ok) return fail(verified.error || "UNAUTHORIZED", verified.status || 401);

  const db = serviceClient();
  const { error } = await db
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("device_id", verified.device!.device_id);
  if (error) return fail("DB_ERROR", 500, { detail: error.message });

  return json({ ok: true });
});
