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
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://genoti.ai";

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
      `<b>${esc(app.business_name)}</b> is approved.
       ${alreadyExisted ? "An account already existed, so we sent a set-password link." :
                          "Their account was created and a set-password link was emailed to"}
       <b>${esc(app.email)}</b>.`,
      "ok"
    );

  } catch (err) {
    return page("Something went wrong", esc(err instanceof Error ? err.message : String(err)), "bad");
  }
});
