import { createClient } from '@supabase/supabase-js'

const CONNECTION_ID = 'default'

function supabaseAdmin() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
}

function decodeState(rawState) {
  try {
    if (!rawState) return {}
    return JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  const { code, state } = req.query || {}
  const decodedState = decodeState(state)
  const redirectUrl = decodedState.redirect_url || 'https://devman-liart.vercel.app/documents'

  if (!code) {
    return res.redirect(`${redirectUrl}?google_error=missing_code`)
  }

  try {
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/google-callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok) {
      const message = encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')
      return res.redirect(`${redirectUrl}?google_error=${message}`)
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {}
    const supabase = supabaseAdmin()

    const { data: existing } = await supabase
      .from('google_workspace_connections')
      .select('refresh_token')
      .eq('id', CONNECTION_ID)
      .maybeSingle()

    const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000).toISOString()
    const scopes = String(tokenData.scope || '').split(' ').filter(Boolean)
    const { error } = await supabase.from('google_workspace_connections').upsert({
      id: CONNECTION_ID,
      provider_account_email: userInfo.email || '',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || existing?.refresh_token || '',
      token_expires_at: expiresAt,
      scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) {
      const message = encodeURIComponent(error.message)
      return res.redirect(`${redirectUrl}?google_error=${message}`)
    }

    return res.redirect(`${redirectUrl}?google_connected=true`)
  } catch (err) {
    console.error('google-callback error:', err)
    const message = encodeURIComponent(err.message || 'google_callback_failed')
    return res.redirect(`${redirectUrl}?google_error=${message}`)
  }
}
