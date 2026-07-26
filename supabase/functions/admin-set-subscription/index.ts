import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Change a merchant's subscription (plan / status) and/or resolve an upgrade
// request, using the service role so it never depends on the caller's RLS.
// Authorised by a signed-in admin (JWT) or the ONBOARD_SECRET.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-onboard-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ONBOARD_SECRET = Deno.env.get("ONBOARD_SECRET") ?? "";
    const admin = createClient(URL, SERVICE);

    // ── Authorise + capture who's acting (for the audit trail) ──
    let actor = "admin";
    let authed = false;
    const secret = req.headers.get("x-onboard-secret");
    if (ONBOARD_SECRET && secret && secret === ONBOARD_SECRET) { authed = true; actor = "admin (secret)"; }
    if (!authed) {
      const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data: { user } } = await asCaller.auth.getUser();
      if (user?.email) {
        const { data: row } = await admin.from("admins").select("email").ilike("email", user.email).maybeSingle();
        if (row) { authed = true; actor = user.email; }
      }
    }
    if (!authed) return json({ error: "Not authorised." }, 401);

    const body = await req.json().catch(() => ({}));
    const merchantId = body.merchant_id ? String(body.merchant_id) : null;
    const planKey = body.plan_key ? String(body.plan_key) : null;
    const status = body.status ? String(body.status) : "active";
    const requestId = body.request_id ?? null;
    const requestStatus = body.request_status ? String(body.request_status) : "actioned";

    let subError: string | null = null;
    if (merchantId && planKey) {
      const { error } = await admin.from("merchant_subscriptions")
        .upsert({ merchant_id: merchantId, plan_key: planKey, status, updated_at: new Date().toISOString() }, { onConflict: "merchant_id" });
      if (error) subError = error.message;
    }

    let reqError: string | null = null;
    if (requestId != null) {
      const { error } = await admin.from("upgrade_requests")
        .update({ status: requestStatus, actioned_at: new Date().toISOString(), actioned_by: actor })
        .eq("id", requestId);
      if (error) reqError = error.message;
    }

    if (subError) return json({ error: "subscription: " + subError }, 400);
    if (reqError) return json({ error: "request: " + reqError }, 400);
    return json({ ok: true, merchant_id: merchantId, plan_key: planKey, status, request_id: requestId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
