import { handlePreflight, json, fail } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifySignedRequest } from "../_shared/verify.ts";

// POST /sync-upload
// Body: { deviceId, batchId, kind, sentAt, rows: [{ id, occurredAt, payload }] }
//
// Menyimpan transaksi secara idempoten: unique (store_id, trx_id) +
// `onConflict ... ignoreDuplicates` sehingga retry tidak menggandakan data.
//
// Balikan: { ok, accepted, duplicates, total }

interface Row {
  id?: string | number;
  occurredAt?: string;
  payload?: unknown;
}

const MAX_ROWS = 2000;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  // WAJIB raw body — signature dihitung atas string ini.
  const rawBody = await req.text();

  let body: { batchId?: string; kind?: string; rows?: Row[] };
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return fail("INVALID_JSON", 400);
  }

  const verified = await verifySignedRequest(req, rawBody, {});
  if (!verified.ok) return fail(verified.error || "UNAUTHORIZED", verified.status || 401);

  const device = verified.device!;
  if (!device.store_id) return fail("DEVICE_NOT_PAIRED", 403);

  const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS) : [];
  if (rows.length === 0) return json({ ok: true, accepted: 0, duplicates: 0, total: 0 });

  const batchId = typeof body.batchId === "string" ? body.batchId : null;

  // Susun baris untuk insert. `payload` = objek transaksi utuh dari POS.
  const insertRows = rows.map((r) => ({
    store_id: device.store_id,
    device_id: device.device_id,
    trx_id: String(r.id ?? r.payload?.["id"] ?? ""),
    batch_id: batchId,
    payload: (r.payload ?? r) as Record<string, unknown>,
    occurred_at: r.occurredAt || null,
  })).filter((r) => r.trx_id);

  if (insertRows.length === 0) return json({ ok: true, accepted: 0, duplicates: 0, total: 0 });

  const db = serviceClient();

  // ignoreDuplicates → konflik (store_id, trx_id) dilewati tanpa error.
  const { data, error } = await db
    .from("synced_transactions")
    .upsert(insertRows, { onConflict: "store_id,trx_id", ignoreDuplicates: true })
    .select("trx_id");

  if (error) return fail("DB_UPSERT_FAILED", 500, { detail: error.message });

  const accepted = data?.length ?? 0;
  const duplicates = insertRows.length - accepted;

  await db.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("device_id", device.device_id);

  return json({ ok: true, accepted, duplicates, total: insertRows.length });
});
