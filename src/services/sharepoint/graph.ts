/// ✅ file: src/services/sharepoint/graph.ts
import qs from 'querystring'

/**
 * 🔐 Configuració base SharePoint + Azure
 * (valors carregats des de .env)
 */
const tenant = process.env.AZURE_TENANT_ID!
const clientId = process.env.AZURE_CLIENT_ID!
const clientSecret = process.env.AZURE_CLIENT_SECRET!
const siteDomain = process.env.SHAREPOINT_SITE_DOMAIN!
const siteName = process.env.SHAREPOINT_SITE_NAME!

/**
 * ♻️ Cache simple del token Graph per evitar múltiples peticions
 */
let cachedToken: { access_token: string; expires: number } | null = null

/** 🪙 Obté access token OAuth2 via Client Credentials */
export async function getGraphToken() {
  const now = Date.now()
  if (cachedToken && cachedToken.expires > now) return cachedToken

  const body = qs.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  })

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`❌ Cannot get Graph token: ${res.status} - ${text}`)
  }

  const json = await res.json()
  cachedToken = {
    access_token: json.access_token,
    expires: now + 3_000_000, // ~50 min
  }

  return cachedToken
}

/**
 * 🔗 Helper universal per crides Graph API
 */
async function graphFetch<T>(path: string, init?: RequestInit) {
  const { access_token } = await getGraphToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('❌ Graph API error:', err)
    throw new Error(`Graph error ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}

/**
 * 🏷️ Obté els IDs de site i drive per al site “EsdevenimentsCalBlay”
 */
export async function getSiteAndDrive() {
  const site = await graphFetch<{ id: string }>(`/sites/${siteDomain}:/sites/${siteName}`)
  const drive = await graphFetch<{ id: string }>(`/sites/${site.id}/drive`)
  return { siteId: site.id, driveId: drive.id }
}

/**
 * 📂 Llista carpetes i fitxers d’un path dins del drive del site
 * Exemple de path: "/Esdeveniments/CASAMENTS_2026"
 */
export async function listChildren(path: string) {
  const { driveId } = await getSiteAndDrive()
  const encoded = encodeURIComponent(path)

  type Item = {
    id: string
    name: string
    webUrl: string
    folder?: { childCount: number }
    file?: { mimeType: string }
  }
  

  const data = await graphFetch<{ value: Item[] }>(
    `/drives/${driveId}/root:${encoded}:/children`
  )
  

  return data.value
}

/**
 * 🌍 Crea un enllaç públic (anònim) o intern per a un fitxer del site
 * - scope: 'anonymous' → qualsevol persona amb l’enllaç pot veure’l
 * - scope: 'organization' → només usuaris del domini Cal Blay
 */
export async function createAnonymousViewLink(
  itemId: string,
  scope: 'anonymous' | 'organization' = 'anonymous'
) {
  const { driveId } = await getSiteAndDrive()
  const body = { type: 'view', scope }

  const data = await graphFetch<{ link: { webUrl: string } }>(
    `/drives/${driveId}/items/${itemId}/createLink`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  )
  

  return data.link.webUrl
}
  export async function downloadFileContent(itemId: string) {
  const { driveId } = await getSiteAndDrive()
  const { access_token } = await getGraphToken()

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${access_token}` },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('❌ Graph download error:', text)
    throw new Error(`Graph download error ${res.status}: ${text}`)
  }

  return res
}


