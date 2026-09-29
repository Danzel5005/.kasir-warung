// CORS untuk Edge Functions. POS (Electron) tidak butuh CORS, tapi web-app
// dan pengujian lewat browser butuh ini.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-device-timestamp, x-device-nonce, x-device-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}
