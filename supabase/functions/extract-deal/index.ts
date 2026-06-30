import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { image_base64, mime_type } = await req.json();
    if (!image_base64) throw new Error("image_base64 is required");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY secret not set");

    const prompt = `You are a deal extraction assistant. Analyse this image (a deal screenshot, flyer, Instagram post, WhatsApp forward, or printed board) and extract the deal details.

Return ONLY a valid JSON object with these fields (use null if not found):
{
  "merchant_name": "string — business or restaurant name",
  "location": "string — area/locality/city",
  "service_name": "string — specific service, dish, or product on offer",
  "original_price": "string — original price with currency symbol e.g. ₹1,250",
  "deal_price": "string — discounted price with currency symbol e.g. ₹499",
  "discount_percent": number or null,
  "valid_until": "string — expiry date or condition e.g. '31 Jan 2026' or 'Weekdays only'",
  "category": "one of: Restaurants & Dining | Fitness & Sports | Health & Medical | Beauty & Wellness | Diagnostics | Hospitals | Hospitality | Shared Spaces | Sports Facilities"
}

Do not include any explanation or markdown. Return raw JSON only.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime_type ?? "image/jpeg"};base64,${image_base64}`,
                  detail: "low",
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error("OpenAI error: " + err);
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";

    // Strip markdown code fences if model wraps JSON
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const extracted = JSON.parse(cleaned);

    return new Response(JSON.stringify({ ok: true, data: extracted }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
