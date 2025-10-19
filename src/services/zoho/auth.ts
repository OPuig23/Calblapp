// src/services/zoho/auth.ts
// ✅ Versió optimitzada per evitar límit de peticions OAuth a Zoho
// 100% compatible amb Vercel (ESM + tipus)

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_API_BASE,
} = process.env

// 🧠 Cache temporal del token (en memòria del servidor)
let cachedToken: string | null = null
let tokenExpiry: number | null = null // timestamp en ms

export async function getZohoAccessToken(): Promise<string> {
  // 🔹 Si ja tenim un token vàlid, el reutilitzem
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken
  }

  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('❌ Variables d’entorn ZOHO incompletes')
  }

  // 🔄 Sol·licitud de token nou a Zoho
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

  // 🧩 Guardem token i temps d’expiració (~1 h per defecte)
  cachedToken = data.access_token
  tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000 // marge de 1 min

  console.log('🔐 Nou token Zoho obtingut i emmagatzemat en memòria.')
  return cachedToken
}

export async function zohoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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

  if (!res.ok) {
    const err = await res.text()
    console.error('[ZohoFetch] ❌', err)
    throw new Error(`Error Zoho ${res.status}`)
  }

  return (await res.json()) as T
}
