import { NextResponse } from 'next/server'
import { listChildren } from '@/services/sharepoint/graph'

export const runtime = 'nodejs'

/**
 * Tipus bàsic d’un element SharePoint retornat per Graph
 */
interface SharePointItem {
  id: string
  name: string
  webUrl: string
  folder?: { childCount: number }
  file?: { mimeType: string }
}

/**
 * 🔹 GET → Llista carpetes i fitxers del site
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || '/Esdeveniments'
    const items: SharePointItem[] = await listChildren(path)
    return NextResponse.json({ items })
  } catch (error: unknown) {
    console.error('❌ Error GET /api/sharepoint/browse:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * 🔹 POST → Retorna l’URL pública del fitxer (busca recursivament dins /Esdeveniments)
 */
export async function POST(req: Request) {
  try {
    const { itemId } = (await req.json()) as { itemId?: string }

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    /**
     * Cerca recursivament dins de la jerarquia de carpetes
     */
    async function findFileRecursive(path: string): Promise<SharePointItem | null> {
      const children: SharePointItem[] = await listChildren(path)

      for (const item of children) {
        if (item.id === itemId) return item
        if (item.folder) {
          const subPath = `${path}/${item.name}`
          const result = await findFileRecursive(subPath)
          if (result) return result
        }
      }
      return null
    }

    const file = await findFileRecursive('/Esdeveniments')

    if (!file) {
      console.warn(`⚠️ Fitxer amb id=${itemId} no trobat dins /Esdeveniments`)
      return NextResponse.json({ error: 'file not found' }, { status: 404 })
    }

    // ✅ URL pública i estable
    return NextResponse.json({ url: file.webUrl })
  } catch (error: unknown) {
    console.error('❌ Error POST /api/sharepoint/browse:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
