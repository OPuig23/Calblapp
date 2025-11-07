export async function getGraphToken() {
  const tenant = process.env.AZURE_TENANT_ID!
  const clientId = process.env.AZURE_CLIENT_ID!
  const clientSecret = process.env.AZURE_CLIENT_SECRET!

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Token Graph error: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token as string
}

/** Retorna un ReadableStream amb el CSV */
export async function fetchSharePointCsv() {
  const token = await getGraphToken()
  const siteId = process.env.SHAREPOINT_SITE_ID!
  const path = process.env.SP_FILE_PATH! // p.ex. "Documents compartits/Esdeveniments/Informe de oportunidades.csv"

  const url = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive/root:/${encodeURIComponent(path)}:/content`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Graph download error: ${res.status} ${await res.text()}`)
  return res.body! // ReadableStream<Uint8Array>
}
