import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Delete any previous unused codes for this email
    await supabase
      .from("otp_codes")
      .delete()
      .eq("email", email)
      .eq("used", false);

    // Store new code
    const { error: dbErr } = await supabase
      .from("otp_codes")
      .insert({ email, code, expires_at: expiresAt });
    if (dbErr) throw new Error("Failed to store OTP: " + dbErr.message);

    // Send via Mailgun
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY")!;
    const MAILGUN_DOMAIN  = Deno.env.get("MAILGUN_DOMAIN")!;
    const MAILGUN_REGION  = Deno.env.get("MAILGUN_REGION") ?? "us";
    const MAILGUN_BASE    = MAILGUN_REGION === "eu"
      ? "https://api.eu.mailgun.net"
      : "https://api.mailgun.net";

    const form = new FormData();
    form.append("from",    `Genoti AI <noreply@${MAILGUN_DOMAIN}>`);
    form.append("to",      email);
    form.append("subject", "Your Genoti verification code");
    form.append("html", `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
             background:#F9FAFB;margin:0;padding:40px 20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:18px;
              padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="font-size:22px;font-weight:800;color:#111827;margin-bottom:4px">✨ Genoti AI</div>
    <div style="font-size:13px;color:#6B7280;margin-bottom:28px">Discover, Book here, Save more</div>
    <p style="font-size:15px;color:#374151;margin-bottom:20px">
      Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.
    </p>
    <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#111827;
                background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:14px;
                padding:22px 16px;text-align:center">${code}</div>
    <p style="font-size:13px;color:#9CA3AF;margin-top:24px;line-height:1.6">
      If you didn't request this code, you can safely ignore this email.<br>
      Someone may have entered your email by mistake.
    </p>
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0">
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

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
