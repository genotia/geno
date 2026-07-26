import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Owner clicks approve or reject from the notification email.
//   /review-merchant-application?id=<uuid>&token=<secret>&action=approve|reject
//
// Approving is the ONLY thing that provisions a merchant account. Until then
// the applicant has no login. The per-application token is the authorisation,
// so deploy this with --no-verify-jwt (a link from an email carries no JWT).

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function page(title: string, body: string, tone: "ok" | "warn" | "bad" = "ok") {
  const bar = tone === "ok" ? "#1D9E75" : tone === "warn" ? "#B45309" : "#EF4444";
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
             background:#F9FAFB;margin:0;padding:48px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:32px;
              box-shadow:0 4px 24px rgba(0,0,0,.08);border-top:4px solid ${bar}">
    <div style="font-size:19px;font-weight:800;color:#111827;margin-bottom:10px">${esc(title)}</div>
    <div style="font-size:14px;color:#374151;line-height:1.65">${body}</div>
  </div>
</body></html>`, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Flat, per-merchant catalog tables copied into a newly-approved salon/spa
// merchant from the template workspace. Config/catalog only — never
// transactional data (bookings, clients, invoices). Relational config with
// cross-row foreign keys (e.g. loyalty tiers → loyalty config, memberships →
// services) is intentionally NOT deep-copied here; add those once the FK
// remapping is known. Edit this list to match your schema.
const TEMPLATE_TABLES = [
  "service_categories",
  "services",
  "products",
  "rooms",
  "suppliers",
  "campaign_templates",
  "client_segments",
];

// Best-effort copy — never blocks the approval. Any table that is missing,
// empty, or errors is skipped.
async function seedFromTemplate(
  supabase: ReturnType<typeof createClient>,
  newMerchantId: string,
): Promise<string[]> {
  const copied: string[] = [];
  const { data: cfg } = await supabase
    .from("onboarding_config").select("value").eq("key", "salon_spa_template_merchant_id").maybeSingle();
  const templateId = (cfg?.value ?? "").trim();
  if (!templateId) return copied;

  for (const table of TEMPLATE_TABLES) {
    try {
      const { data: rows, error } = await supabase.from(table).select("*").eq("merchant_id", templateId);
      if (error || !rows?.length) continue;
      const copies = rows.map((r: Record<string, unknown>) => {
        const c = { ...r, merchant_id: newMerchantId };
        delete c.id; delete c.created_at; delete c.updated_at;
        return c;
      });
      const { error: insErr } = await supabase.from(table).insert(copies);
      if (!insErr) copied.push(`${table} (${copies.length})`);
    } catch (_e) { /* skip this table */ }
  }
  return copied;
}

async function mailgun(to: string, subject: string, html: string) {
  const KEY    = Deno.env.get("MAILGUN_API_KEY")!;
  const DOMAIN = Deno.env.get("MAILGUN_DOMAIN")!;
  const REGION = Deno.env.get("MAILGUN_REGION") ?? "us";
  const BASE   = REGION === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const form = new FormData();
  form.append("from", `Genoti AI <noreply@${DOMAIN}>`);
  form.append("to", to);
  form.append("subject", subject);
  form.append("html", html);
  const res = await fetch(`${BASE}/v3/${DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa("api:" + KEY) },
    body: form,
  });
  if (!res.ok) throw new Error("Mailgun error: " + (await res.text()));
}

const shell = (heading: string, body: string) => `
<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  background:#F9FAFB;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:36px 32px;
              box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:16px">${heading}</div>
    ${body}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:26px 0">
    <p style="font-size:12px;color:#9CA3AF;text-align:center">
      © ${new Date().getFullYear()} Genoti AI · All rights reserved</p>
  </div>
</body></html>`;

serve(async (req) => {
  try {
    const url    = new URL(req.url);
    const id     = url.searchParams.get("id") ?? "";
    const token  = url.searchParams.get("token") ?? "";
    const action = url.searchParams.get("action") ?? "";

    if (!id || !token || !["approve", "reject"].includes(action)) {
      return page("Invalid link", "This approval link is missing information or malformed.", "bad");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    // Canonical host: genoti.ai 308-redirects to www, which can drop the
    // recovery token, so point the set-password link straight at www.
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://www.genoti.ai";

    const { data: app, error } = await supabase
      .from("merchant_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !app) return page("Not found", "No application matches this link.", "bad");

    // Constant work regardless of match; the token is the only credential here.
    if (app.approval_token !== token) {
      return page("Link not valid", "This approval link is not valid for that application.", "bad");
    }

    if (app.status !== "pending") {
      return page(
        "Already reviewed",
        `<b>${esc(app.business_name)}</b> was already marked
         <b>${esc(app.status)}</b>${app.reviewed_at ? " on " + esc(new Date(app.reviewed_at).toLocaleString()) : ""}.
         Nothing changed.`,
        "warn"
      );
    }

    /* ── Reject ───────────────────────────────────────────── */
    if (action === "reject") {
      await supabase.from("merchant_applications")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: "email-link" })
        .eq("id", id);
      return page(
        "Request rejected",
        `<b>${esc(app.business_name)}</b> was rejected and no account was created.
         They have not been emailed, so you can follow up yourself if you want to.`,
        "warn"
      );
    }

    /* ── Approve: this is the only path that creates an account ── */
    const approvedAt = new Date().toISOString();
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: app.email,
      email_confirm: true,
      // Only the service role can write app_metadata, so this is the access flag.
      app_metadata: { merchant_approved: true, approved_at: approvedAt, role: "merchant" },
      user_metadata: {
        full_name:     app.full_name,
        business_name: app.business_name,
        address:       app.address,
        phone:         app.phone,
        num_branches:  app.num_branches,
        num_staff:     app.num_staff,
        plan:          app.plan,
        approved_at:   approvedAt,
      },
    });

    let alreadyExisted = false;
    if (createErr) {
      // Treat an existing account as fine: still mark approved, still send the link.
      if (/already|exists|registered/i.test(createErr.message)) alreadyExisted = true;
      else return page("Could not create the account", esc(createErr.message), "bad");
    }

    // Password-set link, sent through Mailgun so it matches the rest of our mail.
    const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: app.email,
      options: { redirectTo: `${SITE_URL}/merchant/index.html` },
    });
    if (linkErr) return page("Could not create the set-password link", esc(linkErr.message), "bad");

    const actionLink = link?.properties?.action_link ?? `${SITE_URL}/merchant/index.html`;

    // If the account predates this flow, stamp the approval flag on it now,
    // otherwise it would still be blocked at login.
    const existingId = created?.user?.id ?? link?.user?.id;
    if (alreadyExisted && existingId) {
      const { error: metaErr } = await supabase.auth.admin.updateUserById(existingId, {
        app_metadata: { merchant_approved: true, approved_at: approvedAt, role: "merchant" },
      });
      if (metaErr) return page("Could not mark the account approved", esc(metaErr.message), "bad");
    }

    /* ── Provision the merchant's workspace (tenant) ──
       Approval creates the merchants row + owner merchant_users row, so the
       merchant logs straight into their own Merchant OS. Idempotent: skipped
       if this owner already has a workspace. */
    const userId = created?.user?.id ?? link?.user?.id ?? existingId;
    let seeded: string[] = [];
    if (userId) {
      const { data: existingMU } = await supabase
        .from("merchant_users").select("merchant_id").eq("user_id", userId).limit(1).maybeSingle();

      if (!existingMU) {
        const baseSlug = (app.business_name || "merchant").toLowerCase()
          .replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "").slice(0, 40) || "merchant";
        const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

        const { data: merchant, error: mErr } = await supabase
          .from("merchants")
          .insert({ name: app.business_name, category: app.category ?? null, slug })
          .select("id")
          .single();
        if (mErr) return page("Could not create the workspace", esc(mErr.message), "bad");

        const { error: muErr } = await supabase
          .from("merchant_users")
          .insert({ user_id: userId, merchant_id: merchant.id, role: "admin" });
        if (muErr) return page("Could not link the owner to the workspace", esc(muErr.message), "bad");

        // Start every new merchant on the basic package (Marketplace: Services,
        // Deals, Bookings). Without a subscription row plan-gating fails open and
        // they'd see everything — the admin upgrades the plan when appropriate.
        await supabase.from("merchant_subscriptions")
          .upsert({ merchant_id: merchant.id, plan_key: "starter", status: "active" }, { onConflict: "merchant_id" });

        // Salon/Spa merchants get the built-out module catalog copied in.
        if (["salon", "spa"].includes((app.category ?? "").toLowerCase())) {
          seeded = await seedFromTemplate(supabase, merchant.id);
        }
      }
    }

    await mailgun(
      app.email,
      "Your Genoti business account is approved",
      shell("You are approved 🎉", `
        <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 18px">
          Hi ${esc(app.full_name)}, <b>${esc(app.business_name)}</b> has been approved on Genoti.
          Set your password to open your dashboard.
        </p>
        <p style="margin:0 0 22px">
          <a href="${esc(actionLink)}"
             style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;
                    font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">
            Set password and log in</a>
        </p>
        <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0">
          This link expires in 24 hours. If it does, use Forgot password on the login page.
        </p>`)
    );

    await supabase.from("merchant_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "email-link",
        notes: alreadyExisted ? "account already existed; set-password link sent" : null,
      })
      .eq("id", id);

    return page(
      "Approved",
      `<b>${esc(app.business_name)}</b> is approved${app.category ? ` (${esc(app.category)})` : ""}.
       ${alreadyExisted ? "An account already existed, so we sent a set-password link." :
                          "Their account and workspace were created and a set-password link was emailed to"}
       <b>${esc(app.email)}</b>.
       ${seeded.length ? `<br><br>Seeded from the template: ${esc(seeded.join(", "))}.` : ""}`,
      "ok"
    );

  } catch (err) {
    return page("Something went wrong", esc(err instanceof Error ? err.message : String(err)), "bad");
  }
});
