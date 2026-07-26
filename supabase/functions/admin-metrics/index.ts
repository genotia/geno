import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Control-plane data for the admin panel. Verifies the caller is an admin,
// then reads across ALL tenants with the service role (bypassing RLS) and
// returns the merchant directory with plan + live usage, plus the plan and
// module catalogs. One call populates the whole control plane.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller must be a signed-in admin.
    const asCaller = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user }, error: uErr } = await asCaller.auth.getUser();
    if (uErr || !user?.email) return json({ error: "You must be signed in." }, 401);

    const admin = createClient(URL, SERVICE);
    const { data: adminRow } = await admin.from("admins").select("email").ilike("email", user.email).maybeSingle();
    if (!adminRow) return json({ error: "Not authorised." }, 403);

    // Catalogs + tenants + subscriptions + usage, in parallel.
    const [plansR, modulesR, merchantsR, subsR, usageR] = await Promise.all([
      admin.from("plans").select("*").order("rank"),
      admin.from("modules").select("*").order("sort"),
      admin.from("merchants").select("id, name, category, slug, listed, created_at"),
      admin.from("merchant_subscriptions").select("*"),
      admin.rpc("admin_merchant_usage"),
    ]);

    const plans   = plansR.data ?? [];
    const modules = modulesR.data ?? [];
    const subs    = new Map((subsR.data ?? []).map((s: Record<string, unknown>) => [s.merchant_id, s]));
    const usage   = new Map((usageR.data ?? []).map((u: Record<string, unknown>) => [u.merchant_id, u]));
    const planBy  = new Map(plans.map((p: Record<string, unknown>) => [p.key, p]));

    const merchants = (merchantsR.data ?? []).map((m: Record<string, unknown>) => {
      const sub = subs.get(m.id) as Record<string, unknown> | undefined;
      const plan = sub ? planBy.get(sub.plan_key) as Record<string, unknown> | undefined : undefined;
      const u = (usage.get(m.id) ?? {}) as Record<string, number | string>;
      return {
        id: m.id, name: m.name, category: m.category, slug: m.slug, listed: m.listed, created_at: m.created_at,
        plan_key:  sub?.plan_key ?? null,
        plan_name: plan?.name ?? null,
        price_monthly: (plan?.price_monthly as number) ?? 0,
        status:    sub?.status ?? "none",
        renews_at: sub?.renews_at ?? null,
        usage: {
          bookings: Number(u.bookings ?? 0), clients: Number(u.clients ?? 0),
          staff: Number(u.staff ?? 0), services: Number(u.services ?? 0),
          deals: Number(u.deals ?? 0), products: Number(u.products ?? 0),
          memberships: Number(u.memberships ?? 0),
        },
        last_active: u.last_active ?? null,
      };
    });

    // KPIs
    const active = merchants.filter((m) => m.status === "active");
    const mrr = active.reduce((s, m) => s + (m.price_monthly || 0), 0);
    const byCategory: Record<string, number> = {};
    merchants.forEach((m) => { const c = m.category ?? "uncategorised"; byCategory[c] = (byCategory[c] || 0) + 1; });
    const byPlan: Record<string, number> = {};
    merchants.forEach((m) => { const p = m.plan_name ?? "none"; byPlan[p] = (byPlan[p] || 0) + 1; });

    // Module adoption = merchants with any data in that module's backing table.
    const usageKeys = ["bookings", "clients", "staff", "services", "deals", "products", "memberships"] as const;
    const adoption: Record<string, number> = {};
    for (const k of usageKeys) adoption[k] = merchants.filter((m) => (m.usage as Record<string, number>)[k] > 0).length;

    return json({
      kpis: {
        merchants: merchants.length,
        active: active.length,
        trialing: merchants.filter((m) => m.status === "trial").length,
        mrr,
        byCategory, byPlan, adoption,
      },
      plans, modules, merchants,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
