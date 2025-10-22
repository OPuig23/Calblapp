// src/services/zoho/auth.ts
// ✅ Versió estable (Vercel/Node) amb cache de token i log de resposta
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_API_BASE,
} = process.env

let cachedToken: string | null = null
let tokenExpiry: number | null = null

export async function getZohoAccessToken(): Promise<string> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('❌ Variables d’entorn ZOHO incompletes')
  }

  const res = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[ZohoAuth] ❌', text)
    throw new Error(`Error ZohoAuth ${res.status}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = data.access_token
  tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000
  console.log('🔐 Nou token Zoho obtingut i emmagatzemat en memòria.')
  return cachedToken
}

export async function zohoFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (!ZOHO_API_BASE) throw new Error('❌ Falta ZOHO_API_BASE')
  const token = await getZohoAccessToken()
  const url = `${ZOHO_API_BASE}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[ZohoFetch] ❌', json)
    throw new Error(`Error Zoho ${res.status}`)
  }

  // 🧐 Trace útil (primer registre només)
  const sample = (json as any)?.data?.[0]
  if (sample) console.log('🔎 Zoho sample:', JSON.stringify(sample, null, 2))
  return json as T
}
