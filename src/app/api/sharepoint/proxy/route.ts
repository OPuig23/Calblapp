// ✅ file: src/app/api/sharepoint/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 🔧 Llegeix variables d'entorn
const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const SITE_DOMAIN = process.env.SHAREPOINT_SITE_DOMAIN || 'calblayrest.sharepoint.com'
const SITE_NAME = process.env.SHAREPOINT_SITE_NAME || 'EsdevenimentsCalBlay'
const LIBRARY_NAME = process.env.SHAREPOINT_LIBRARY_NAME || 'Documents compartits'

// Petita “caché” en memòria per no repetir peticions
let cachedSiteId: string | null = null
let cachedDriveId: string | null = null

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[sharepoint/proxy] Token error:', text)
    throw new Error('No s’ha pogut obtenir el token d’Azure AD')
  }

  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

async function getSiteId(token: string) {
  if (cachedSiteId) return cachedSiteId

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_DOMAIN}:/sites/${SITE_NAME}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[sharepoint/proxy] Site error:', text)
    throw new Error('No s’ha pogut obtenir el Site de SharePoint')
  }

  const json = (await res.json()) as { id: string }
  cachedSiteId = json.id
  return cachedSiteId
}

async function getDriveId(token: string, siteId: string) {
  if (cachedDriveId) return cachedDriveId

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    console.error('[sharepoint/proxy] Drives error:', text)
    throw new Error('No s’han pogut llistar les llibreries de documents')
  }

  const json = (await res.json()) as { value: Array<{ id: string; name: string }> }

  const drive = json.value.find(
    (d) => d.name.toLowerCase() === LIBRARY_NAME.toLowerCase()
  )

  if (!drive) {
    console.error(
      `[sharepoint/proxy] No s’ha trobat la llibreria "${LIBRARY_NAME}". Drives disponibles:`,
      json.value.map((d) => d.name)
    )
    throw new Error('No s’ha trobat la llibreria de documents a SharePoint')
  }

  cachedDriveId = drive.id
  return cachedDriveId
}

// 🔍 Extreu el path dins de "Documents compartits" a partir de la URL original
function getPathInsideLibrary(fileUrl: string) {
  const u = new URL(fileUrl)
  const decodedPath = decodeURIComponent(u.pathname) // ex: /sites/EsdevenimentsCalBlay/Documents compartits/Esdeveniments/…
  const marker = '/documents compartits/'

  const idx = decodedPath.toLowerCase().indexOf(marker)
  if (idx === -1) {
    throw new Error('La URL no conté el segment "Documents compartits"')
  }

  // Path intern dins la llibreria: Esdeveniments/Arxiu.pdf
  const inner = decodedPath.slice(idx + marker.length)
  return inner.replace(/^\/+/, '') // treu possibles /
}

/**
 * GET /api/sharepoint/proxy?fileUrl=…
 * - Rep la URL de SharePoint
 * - Usa Microsoft Graph (client credentials) per llegir el fitxer
 * - Torna el binari perquè l’iframe el pugui mostrar
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const fileUrl = url.searchParams.get('fileUrl')

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Falta el paràmetre fileUrl' },
        { status: 400 }
      )
    }

    const pathInside = getPathInsideLibrary(fileUrl)

    const token = await getAccessToken()
    const siteId = await getSiteId(token)
    const driveId = await getDriveId(token, siteId)

    const graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURI(
      pathInside
    )}:/content`

    const res = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[sharepoint/proxy] Error obtenint fitxer:', text)
      return NextResponse.json(
        { error: 'SharePoint error al descarregar el fitxer' },
        { status: res.status }
      )
    }

    const contentType = res.headers.get('content-type') || 'application/pdf'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // opcional, per suggerir nom d’arxiu
        'Content-Disposition': 'inline',
      },
    })
  } catch (err: any) {
    console.error('[sharepoint/proxy] Error general:', err)
    return NextResponse.json(
      { error: err.message || 'Error intern del servidor' },
      { status: 500 }
    )
  }
}
