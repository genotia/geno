import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEAL_SCHEMA = `{
  "merchant_name": "string — business or restaurant name",
  "location": "string — area/locality/city",
  "service_name": "string — specific service, dish, or product on offer",
  "original_price": "string — original price with currency symbol e.g. ₹1,250",
  "deal_price": "string — discounted price with currency symbol e.g. ₹499",
  "discount_percent": number or null,
  "valid_until": "string — expiry date or condition e.g. '31 Jan 2026' or 'Weekdays only'",
  "category": "one of: Restaurants & Dining | Fitness & Sports | Health & Medical | Beauty & Wellness | Diagnostics | Hospitals | Hospitality | Shared Spaces | Sports Facilities"
}`;

const PROMPT = `You are a deal extraction assistant. Extract deal details and return ONLY a valid JSON object with these fields (use null if not found):
${DEAL_SCHEMA}

Do not include any explanation or markdown. Return raw JSON only.`;

function extractPageText(html: string): string {
  const og: Record<string, string> = {};
  const ogRe = /<meta[^>]+property=["']og:(\w+)["'][^>]+content=["']([^"']+)["']/gi;
  let m;
  while ((m = ogRe.exec(html)) !== null) og[m[1]] = m[2];

  const metaDesc = (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html) ?? [])[1] ?? "";
  const title = (/<title[^>]*>([^<]+)<\/title>/i.exec(html) ?? [])[1] ?? "";

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  return [
    title && `Page title: ${title}`,
    og.title && `OG title: ${og.title}`,
    og.description && `OG description: ${og.description}`,
    metaDesc && `Meta description: ${metaDesc}`,
    og.price_amount && `OG price: ${og.price_currency ?? ""} ${og.price_amount}`,
    `Page text: ${bodyText}`,
  ].filter(Boolean).join("\n");
}

async function callMistral(key: string, messages: object[]): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "pixtral-12b-2409",
      messages,
      max_tokens: 400,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error("Mistral error: " + await res.text());
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "{}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY secret not set");

    let raw: string;

    if (body.url) {
      // ── URL mode ──────────────────────────────────────────────
      const pageRes = await fetch(body.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-IN,en;q=0.9",
        },
        redirect: "follow",
      });
      if (!pageRes.ok) throw new Error(`Could not fetch URL (HTTP ${pageRes.status})`);
      const html = await pageRes.text();
      const pageText = extractPageText(html);

      raw = await callMistral(MISTRAL_API_KEY, [
        { role: "user", content: `${PROMPT}\n\nHere is content from the deal page:\n\n${pageText}` },
      ]);

    } else if (body.image_base64) {
      // ── Image mode ────────────────────────────────────────────
      raw = await callMistral(MISTRAL_API_KEY, [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${body.mime_type ?? "image/jpeg"};base64,${body.image_base64}` },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ]);

    } else {
      throw new Error("Provide either url or image_base64");
    }

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
