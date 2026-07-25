import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Approve (or un-approve) a merchant account by email.
//
// Only the service role can write app_metadata, which is the merchant access
// flag. This function does that write, but ONLY after confirming the caller is
// a signed-in admin (their email is on the admins table). The admin panel calls
// it with the admin's session, so the caller's identity comes from their JWT.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const URL     = Deno.env.get("SUPABASE_URL")!;
    const ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Who is calling? Identity comes from the caller's own JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await asCaller.auth.getUser();
    if (uErr || !user?.email) return json({ error: "You must be signed in." }, 401);

    const admin = createClient(URL, SERVICE);

    // 2. Is the caller an admin? The admins table is the gate.
    const { data: adminRow, error: aErr } = await admin
      .from("admins").select("email").ilike("email", user.email).maybeSingle();
    if (aErr) return json({ error: "Admin check failed: " + aErr.message }, 400);
    if (!adminRow) return json({ error: "Not authorised — this account is not an admin." }, 403);

    // 3. Find the target merchant account by email.
    const body = await req.json().catch(() => ({}));
    const target = String(body.email ?? "").trim().toLowerCase();
    const approve = body.approve !== false;   // default true; pass approve:false to revoke
    if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      return json({ error: "A valid merchant email is required." }, 400);
    }

    let match: { id: string; app_metadata?: Record<string, unknown> } | null = null;
    for (let page = 1; page <= 25 && !match; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      match = (data.users.find((u) => (u.email ?? "").toLowerCase() === target) as typeof match) ?? null;
      if (data.users.length < 200) break;
    }
    if (!match) return json({ error: `No account found for ${target}. They need to sign up first.` }, 404);

    // 4. Flip the approval flag. Service role only — this is the real gate.
    const { error: upErr } = await admin.auth.admin.updateUserById(match.id, {
      app_metadata: {
        ...(match.app_metadata ?? {}),
        merchant_approved: approve,
        role: "merchant",
        approved_at: approve ? new Date().toISOString() : null,
        approved_by: user.email,
      },
    });
    if (upErr) return json({ error: upErr.message }, 400);

    return json({ ok: true, email: target, approved: approve });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
