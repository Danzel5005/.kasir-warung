import { handlePreflight, json, fail } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifySignedRequest } from "../_shared/verify.ts";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_ROWS = 2000;
const MAX_ACKS = 200;

interface StockRow {
  id?: string;
  type?: string;
  name?: string;
  unit?: string;
  stock?: number | null;
  minStock?: number;
  updatedAt?: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return fail("BODY_TOO_LARGE", 413);

  let body: {
    deviceId?: string;
    mode?: string;
    deletedIds?: { type?: string; id?: string }[];
    claim?: string[];
    features?: { ingredientsEnabled?: boolean };
    rows?: StockRow[];
    ack?: { eventId?: string; status?: string; reason?: string; stockAfter?: number }[];
  };
  try { body = JSON.parse(rawBody || "{}"); }
  catch { return fail("INVALID_JSON", 400); }

  const verified = await verifySignedRequest(req, rawBody, {});
  if (!verified.ok) return fail(verified.error || "UNAUTHORIZED", verified.status || 401);
  const device = verified.device!;
  if (!device.store_id) return fail("DEVICE_NOT_PAIRED", 403);

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const acknowledgements = Array.isArray(body.ack) ? body.ack : [];
  if (body.rows !== undefined && !Array.isArray(body.rows)) return fail("INVALID_ROWS", 400);
  if (rows.length > MAX_ROWS || acknowledgements.length > MAX_ACKS) return fail("TOO_MANY_ROWS", 413);

  const db = serviceClient();
  const now = new Date().toISOString();
  // ponytail: five-minute claim lease; add lease renewal if local POS work can exceed this.
  const staleClaimAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { error: staleClaimError } = await db.from("restock_events").update({
    status: "pending", processing_at: null, processing_by_device: null,
  }).eq("store_id", device.store_id).eq("status", "processing").lt("processing_at", staleClaimAt);
  if (staleClaimError) return fail("RESTOCK_LEASE_FAILED", 500, { detail: staleClaimError.message });

  const claimIds = Array.isArray(body.claim) ? body.claim : [];
  if (claimIds.length > MAX_ACKS) return fail("TOO_MANY_CLAIMS", 413);
  const claimedEventIds: string[] = [];
  for (const eventId of claimIds) {
    if (!eventId) continue;
    const { data, error } = await db.from("restock_events").update({
      status: "processing", processing_at: now, processing_by_device: device.device_id,
    }).eq("id", eventId).eq("store_id", device.store_id).eq("status", "pending").select("id").maybeSingle();
    if (error) return fail("RESTOCK_CLAIM_FAILED", 500, { detail: error.message });
    if (data?.id) claimedEventIds.push(data.id);
  }
  const ingredientsEnabled = body.features?.ingredientsEnabled === true;
  const validRows = rows.map((row) => {
    const stock = row.stock === null ? null : Number(row.stock);
    const minStock = Number(row.minStock ?? 0);
    if (!row.id || !row.name || !["ingredient", "menu"].includes(row.type || "") ||
      (stock !== null && (!Number.isFinite(stock) || stock < 0)) || !Number.isFinite(minStock) || minStock < 0) return null;
    if (row.type === "ingredient" && !ingredientsEnabled) return null;
    return {
      store_id: device.store_id,
      item_type: row.type,
      item_id: String(row.id).slice(0, 200),
      name: String(row.name).slice(0, 200),
      unit: row.unit ? String(row.unit).slice(0, 40) : null,
      current_stock: stock,
      min_stock: minStock,
      pos_updated_at: row.updatedAt || now,
    };
  });
  if (validRows.some((row) => row === null)) return fail("INVALID_STOCK_ROW", 400);
  const stockRows = validRows.filter((row): row is NonNullable<typeof row> => row !== null);

  if (body.mode !== "full" && body.mode !== "delta") {
    return fail("INVALID_MODE", 400);
  }

  if (Array.isArray(body.deletedIds) && body.deletedIds.length > MAX_ROWS) return fail("TOO_MANY_DELETIONS", 413);
  if (stockRows.length) {
    const { error } = await db.from("stock_items").upsert(stockRows, {
      onConflict: "store_id,item_type,item_id",
    });
    if (error) return fail("STOCK_UPSERT_FAILED", 500, { detail: error.message });
  }

  if (Array.isArray(body.deletedIds)) {
    for (const itemType of ["ingredient", "menu"]) {
      const ids = body.deletedIds.filter((item) => item?.type === itemType && item?.id).map((item) => String(item.id));
      if (!ids.length) continue;
      const { error } = await db.from("stock_items").delete().eq("store_id", device.store_id)
        .eq("item_type", itemType).in("item_id", ids);
      if (error) return fail("STOCK_DELETE_FAILED", 500, { detail: error.message });
    }
  }

  for (const ack of acknowledgements) {
    if (!ack.eventId || !["applied", "rejected"].includes(ack.status || "")) continue;
    const patch = ack.status === "applied"
      ? { status: "applied", stock_after: Number.isFinite(ack.stockAfter) ? ack.stockAfter : null, applied_at: now, applied_by_device: device.device_id }
      : { status: "rejected", reject_reason: String(ack.reason || "Ditolak di POS").slice(0, 300), applied_at: now, applied_by_device: device.device_id };
    const { error } = await db.from("restock_events").update(patch)
      .eq("id", ack.eventId).eq("store_id", device.store_id).eq("status", "processing")
      .eq("processing_by_device", device.device_id);
    if (error) return fail("RESTOCK_ACK_FAILED", 500, { detail: error.message });
  }

  const { error: stateError } = await db.from("stock_sync_state").upsert({
    store_id: device.store_id,
    device_id: device.device_id,
    ingredients_enabled: ingredientsEnabled,
    last_seen_at: now,
  }, { onConflict: "store_id" });
  if (stateError) return fail("STOCK_STATE_FAILED", 500, { detail: stateError.message });
  const { error: deviceError } = await db.from("devices").update({ last_seen_at: now }).eq("device_id", device.device_id);
  if (deviceError) return fail("DEVICE_UPDATE_FAILED", 500, { detail: deviceError.message });

  const { data: pending, error: pendingError } = await db.from("restock_events")
    .select("id, batch_id, item_type, item_id, item_name, qty, unit, note, requester_name, requester_email, created_at")
    .eq("store_id", device.store_id).eq("status", "pending")
    .order("created_at", { ascending: true }).limit(100);
  if (pendingError) return fail("RESTOCK_QUEUE_FAILED", 500, { detail: pendingError.message });

  const { count, error: countError } = await db.from("stock_items")
    .select("item_id", { count: "exact", head: true }).eq("store_id", device.store_id);
  if (countError) return fail("STOCK_COUNT_FAILED", 500, { detail: countError.message });

  return json({ ok: true, needFull: (count || 0) === 0, pending: pending || [], claimedEventIds });
});