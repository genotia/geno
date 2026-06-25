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
    const { email, code } = await req.json();
    if (!email || !code) throw new Error("Email and code are required.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Look up the OTP
    const { data: row, error: fetchErr } = await supabase
      .from("otp_codes")
      .select("id, code, expires_at, used")
      .eq("email", email)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!row)     throw new Error("Invalid or expired code. Please try again.");
    if (row.code !== code) throw new Error("Incorrect code. Please check and try again.");

    // 2. Mark as used
    await supabase.from("otp_codes").update({ used: true }).eq("id", row.id);

    // 3. Create user if not exists (email already confirmed via OTP)
    let isNewUser = false;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createErr) {
      // User already exists — that's fine, just log them in
      const alreadyExists =
        createErr.message?.toLowerCase().includes("already") ||
        createErr.message?.toLowerCase().includes("exists") ||
        (createErr as any).status === 422;
      if (!alreadyExists) throw new Error(createErr.message);
      isNewUser = false;
    } else {
      isNewUser = true;
    }

    // 4. Generate a magic-link token so the client can open a real Supabase session
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: req.headers.get("origin") + "/index.html" },
    });
    if (linkErr) throw new Error(linkErr.message);

    return new Response(
      JSON.stringify({
        ok: true,
        is_new_user: isNewUser,
        token_hash: linkData.properties.hashed_token,
        email,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
