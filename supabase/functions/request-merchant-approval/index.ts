import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// A merchant asking to list their business does NOT get an account here.
// The request is recorded as pending and emailed to the owner for approval.
// Access is only granted after the owner approves.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const fullName = String(body.full_name ?? "").trim();
    const business = String(body.business_name ?? "").trim();
    const email    = String(body.email ?? "").trim();
    const address  = String(body.address ?? "").trim();
    const phone    = String(body.phone ?? "").trim();
    const plan     = String(body.plan ?? "").trim() || "not specified";
    const branches = Number(body.num_branches) || 1;
    const staff    = Number(body.num_staff) || 1;

    if (!fullName) throw new Error("Your full name is required.");
    if (!business) throw new Error("Your business name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Record the request as pending. Service role, so RLS does not block it.
    const { data: appRow, error: dbErr } = await supabase
      .from("merchant_applications")
      .insert({
        full_name:     fullName,
        business_name: business,
        address:       address || null,
        email,
        phone:         phone || null,
        num_branches:  branches,
        num_staff:     staff,
        plan,
        status:        "pending",
      })
      .select("id, created_at, approval_token")
      .single();
    if (dbErr) throw new Error("Failed to record the request: " + dbErr.message);

    // Notify the owner so they can approve or reject.
    const APPROVAL_EMAIL  = Deno.env.get("APPROVAL_EMAIL") ?? "balaji@genoti.ai";
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY")!;
    const MAILGUN_DOMAIN  = Deno.env.get("MAILGUN_DOMAIN")!;
    const MAILGUN_REGION  = Deno.env.get("MAILGUN_REGION") ?? "us";
    const MAILGUN_BASE    = MAILGUN_REGION === "eu"
      ? "https://api.eu.mailgun.net"
      : "https://api.mailgun.net";

    const SITE_FN = `${Deno.env.get("SUPABASE_URL")}/functions/v1/review-merchant-application`;
    const reviewLink = (action: string) =>
      `${SITE_FN}?id=${appRow?.id}&token=${encodeURIComponent(appRow?.approval_token ?? "")}&action=${action}`;

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:7px 0;font-size:13px;color:#6B7280;width:150px">${esc(label)}</td>
        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600">${esc(value)}</td>
      </tr>`;

    const form = new FormData();
    form.append("from", `Genoti AI <noreply@${MAILGUN_DOMAIN}>`);
    form.append("to", APPROVAL_EMAIL);
    form.append("h:Reply-To", email);
    form.append("subject", `Approval needed: ${business} wants to list on Genoti`);
    form.append("html", `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
             background:#F9FAFB;margin:0;padding:40px 20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;
              padding:36px 32px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px">New merchant request</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:24px">
      This business is waiting on your approval. No access has been granted.
    </div>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E5E7EB">
      ${row("Business", business)}
      ${row("Contact", fullName)}
      ${row("Email", email)}
      ${row("Phone", phone || "not given")}
      ${row("Address", address || "not given")}
      ${row("Branches", String(branches))}
      ${row("Staff", String(staff))}
      ${row("Plan", plan)}
      ${row("Request id", appRow?.id ?? "unknown")}
    </table>

    <div style="margin-top:26px;padding:14px 16px;background:#FFFBEB;border:1px solid #FDE68A;
                border-radius:12px;font-size:13px;color:#B45309;line-height:1.6">
      <strong>Nothing is live yet.</strong> No account exists until you approve.
    </div>

    <div style="margin-top:22px">
      <a href="${reviewLink("approve")}"
         style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;font-weight:700;
                font-size:14px;padding:12px 24px;border-radius:10px;margin-right:8px">
        Approve and create account</a>
      <a href="${reviewLink("reject")}"
         style="display:inline-block;background:#fff;color:#6B7280;text-decoration:none;font-weight:700;
                font-size:14px;padding:12px 22px;border-radius:10px;border:1.5px solid #E5E7EB">
        Reject</a>
    </div>
    <p style="font-size:12px;color:#9CA3AF;margin-top:14px;line-height:1.6">
      Approving creates their account and emails them a set-password link.
      These buttons work once; the request is marked reviewed afterwards.
    </p>

    <p style="font-size:12px;color:#9CA3AF;margin-top:24px;line-height:1.6">
      Reply to this email to reach ${esc(fullName)} directly.
    </p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0">
    <p style="font-size:12px;color:#9CA3AF;text-align:center">
      © ${new Date().getFullYear()} Genoti AI · All rights reserved
    </p>
  </div>
</body>
</html>`);

    const mgRes = await fetch(
      `${MAILGUN_BASE}/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: { Authorization: "Basic " + btoa("api:" + MAILGUN_API_KEY) },
        body: form,
      }
    );

    if (!mgRes.ok) {
      const err = await mgRes.text();
      throw new Error("Mailgun error: " + err);
    }

    return new Response(JSON.stringify({ ok: true, status: "pending" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
