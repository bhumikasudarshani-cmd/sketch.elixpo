import { NextResponse } from 'next/server'

const ELIXPO_AUTH_URL = 'https://accounts.elixpo.com'

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const appOrigin = url.searchParams.get('app_origin') || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${appOrigin}?auth_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${appOrigin}?auth_error=missing_code`)
  }

  const redirectUri = `${url.origin}/api/auth/callback`

  // Exchange code for tokens
  const tokenRes = await fetch(`${ELIXPO_AUTH_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.NEXT_PUBLIC_ELIXPO_AUTH_CLIENT_ID,
      client_secret: process.env.ELIXPO_AUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}))
    console.error('[auth/callback] Token exchange failed:', err)
    return NextResponse.redirect(`${appOrigin}?auth_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()

  // Fetch user profile
  const userRes = await fetch(`${ELIXPO_AUTH_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  if (!userRes.ok) {
    return NextResponse.redirect(`${appOrigin}?auth_error=profile_fetch_failed`)
  }

  const profile = await userRes.json()

  // Build session token (simple random hex for now — in production this goes through the worker + KV)
  const sessionToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')

  const userParam = encodeURIComponent(JSON.stringify({
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatar: profile.avatar,
    isAdmin: profile.isAdmin,
  }))

  return NextResponse.redirect(
    `${appOrigin}?auth_token=${sessionToken}&auth_user=${userParam}`
  )
}
