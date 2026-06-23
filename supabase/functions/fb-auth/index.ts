import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FB_APP_ID     = Deno.env.get('FB_APP_ID')     ?? ''   // set in Supabase dashboard
const FB_APP_SECRET = Deno.env.get('FB_APP_SECRET') ?? ''   // set in Supabase dashboard
const FB_API_VER    = 'v21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url  = new URL(req.url)
  const path = url.pathname.replace(/^\/fb-auth/, '')

  // ── /exchange  short-lived → long-lived token ──
  if (path === '/exchange' && req.method === 'POST') {
    const { short_token, merchant_id } = await req.json()
    if (!short_token) return err('short_token required')

    // Exchange with Facebook
    const fbUrl = `https://graph.facebook.com/${FB_API_VER}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&fb_exchange_token=${short_token}`

    const fbRes  = await fetch(fbUrl)
    const fbData = await fbRes.json()
    if (fbData.error) return err(fbData.error.message)

    const longToken   = fbData.access_token
    const expiresIn   = fbData.expires_in ?? 5183944   // ~60 days

    // Get user name
    const meRes  = await fetch(`https://graph.facebook.com/${FB_API_VER}/me?access_token=${longToken}&fields=name`)
    const meData = await meRes.json()

    // Save to DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await supabase.from('merchant_fb_connections').upsert({
      merchant_id,
      access_token: longToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      fb_user_name: meData.name ?? '',
    }, { onConflict: 'merchant_id' })

    return json({ access_token: longToken, name: meData.name, expires_in: expiresIn })
  }

  // ── /refresh  refresh an expiring long-lived token ──
  if (path === '/refresh' && req.method === 'POST') {
    const { merchant_id } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: conn } = await supabase
      .from('merchant_fb_connections')
      .select('access_token')
      .eq('merchant_id', merchant_id)
      .maybeSingle()

    if (!conn?.access_token) return err('No FB connection found')

    const fbUrl = `https://graph.facebook.com/${FB_API_VER}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&fb_exchange_token=${conn.access_token}`

    const fbRes  = await fetch(fbUrl)
    const fbData = await fbRes.json()
    if (fbData.error) return err(fbData.error.message)

    await supabase.from('merchant_fb_connections').update({
      access_token: fbData.access_token,
      token_expires_at: new Date(Date.now() + (fbData.expires_in ?? 5183944) * 1000).toISOString(),
    }).eq('merchant_id', merchant_id)

    return json({ access_token: fbData.access_token })
  }

  return new Response('Not found', { status: 404, headers: corsHeaders })
})

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
