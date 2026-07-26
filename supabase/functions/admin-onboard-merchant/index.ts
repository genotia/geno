import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin onboarding: create a merchant account with a password already set and
// provision its workspace in one call — no email round-trip. Authorised either
// by a signed-in admin (JWT) or a one-time onboarding secret (x-onboard-secret),
// so it can be driven from the admin panel or a trusted script.

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

    // ── Authorise: onboarding secret OR a signed-in admin ──
    let authed = false;
    const secret = req.headers.get("x-onboard-secret");
    if (ONBOARD_SECRET && secret && secret === ONBOARD_SECRET) authed = true;
    if (!authed) {
      const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data: { user } } = await asCaller.auth.getUser();
      if (user?.email) {
        const { data: row } = await admin.from("admins").select("email").ilike("email", user.email).maybeSingle();
        if (row) authed = true;
      }
    }
    if (!authed) return json({ error: "Not authorised." }, 401);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const businessName = String(body.business_name ?? "").trim() || "New merchant";
    const category = String(body.category ?? "").trim() || null;
    const planKey = String(body.plan_key ?? "growth").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);

    // ── Create (or reuse) the auth user, password set + email confirmed ──
    let userId: string | undefined;
    let created = false;
    const { data: mk, error: mkErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      app_metadata: { role: "merchant" },
      user_metadata: { business_name: businessName, category },
    });
    if (mkErr) {
      if (/already|exists|registered/i.test(mkErr.message)) {
        // Find the existing user and (re)set the password so the shared creds work.
        let page = 1;
        for (;;) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          const u = list.users.find((x) => (x.email ?? "").toLowerCase() === email);
          if (u) { userId = u.id; break; }
          if (!list.users.length || list.users.length < 200) break;
          page++;
        }
        if (userId) await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        return json({ error: mkErr.message }, 400);
      }
    } else {
      userId = mk?.user?.id; created = true;
    }
    if (!userId) return json({ error: "Could not create or find the user." }, 400);

    // ── Provision the workspace (idempotent) ──
    let merchantId: string | undefined;
    let slug: string | undefined;
    const { data: existingMU } = await admin.from("merchant_users").select("merchant_id").eq("user_id", userId).maybeSingle();
    if (existingMU) {
      merchantId = existingMU.merchant_id as string;
    } else {
      const base = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "").slice(0, 40) || "merchant";
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: m, error: mErr } = await admin.from("merchants").insert({ name: businessName, category, slug }).select("id, slug").single();
      if (mErr) return json({ error: "merchants insert: " + mErr.message }, 400);
      merchantId = m.id as string; slug = m.slug as string;
      const { error: muErr } = await admin.from("merchant_users").insert({ user_id: userId, merchant_id: merchantId, role: "admin" });
      if (muErr) return json({ error: "merchant_users insert: " + muErr.message }, 400);
    }

    // ── Subscription (so plan gating + MRR reflect it) ──
    let subError: string | null = null;
    if (planKey) {
      const { error: sErr } = await admin.from("merchant_subscriptions")
        .upsert({ merchant_id: merchantId, plan_key: planKey, status: "active", updated_at: new Date().toISOString() }, { onConflict: "merchant_id" });
      if (sErr) subError = sErr.message;
    }

    return json({
      ok: true, created, email, user_id: userId, merchant_id: merchantId, slug,
      category, plan_key: planKey, sub_error: subError,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
