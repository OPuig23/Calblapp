// /lib/zoho.ts
// ✔️ Server-only utilitats per parlar amb Zoho (100% Vercel-friendly)
export async function getZohoAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN ?? '',
      client_id: process.env.ZOHO_CLIENT_ID ?? '',
      client_secret: process.env.ZOHO_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
    // Evitem cache per tokens
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[ZohoAuth] Error token:', txt);
    throw new Error('No s’ha pogut obtenir access_token de Zoho');
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Crida autenticada a Zoho CRM (server side). No exposa secrets al client.
 */
export async function zohoFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.ZOHO_API_BASE; // ex: https://www.zohoapis.eu/crm/v3
  if (!base) throw new Error('Falta ZOHO_API_BASE a les variables d’entorn');

  const token = await getZohoAccessToken();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[ZohoFetch] Error:', txt);
    throw new Error(`Error Zoho ${res.status}`);
  }

  return res.json() as Promise<T>;
}
