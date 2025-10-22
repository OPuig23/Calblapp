import axios from 'axios'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    params
  )
  return res.data.access_token
}

export async function listEventFiles(eventId: string) {
  const token = await getAccessToken()
  const site = process.env.SHAREPOINT_SITE_NAME
  const domain = process.env.SHAREPOINT_SITE_DOMAIN

  const url = `${GRAPH_BASE}/sites/${domain}:/sites/${site}:/drive/root:/Events/${eventId}:/children`
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  // Retornem només info essencial
  return res.data.value.map((f: any) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    url: f['@microsoft.graph.downloadUrl'],
    lastModified: f.lastModifiedDateTime,
  }))
}
