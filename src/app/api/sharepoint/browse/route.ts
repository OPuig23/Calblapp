// ✅ file: src/app/api/sharepoint/browse/route.ts
import { NextResponse } from 'next/server'
import { listChildren, createAnonymousViewLink } from '@/services/sharepoint/graph'

export const runtime = 'nodejs'

/**
 * 🔹 GET → Llista carpetes i fitxers del site
 * Exemple: /api/sharepoint/browse?path=/Esdeveniments
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || '/Esdeveniments'
    const items = await listChildren(path)
    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('❌ Error GET /api/sharepoint/browse:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * 🔹 POST → Genera un link (anònim o intern) per a un fitxer concret
 * Body:
 * {
 *   "itemId": "xxxx",
 *   "scope": "anonymous" | "organization"
 * }
 */
export async function POST(req: Request) {
  try {
    const { itemId, scope } = await req.json()

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    // valor per defecte = 'anonymous'
    const linkScope = scope === 'organization' ? 'organization' : 'anonymous'

    const url = await createAnonymousViewLink(itemId, linkScope)
    return NextResponse.json({ url })
  } catch (e: any) {
    console.error('❌ Error POST /api/sharepoint/browse:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
