// file: src/app/api/events/[id]/documents/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

/**
 * Tipus retornats a la UI
 */
export type EventDoc = {
  id: string
  title: string
  mimeType?: string
  source: 'firestore-file'
  url: string
  previewUrl?: string
  icon: 'pdf' | 'doc' | 'sheet' | 'slide' | 'img' | 'link'
}

// Detecta icona segons URL/mimetype
function detectIcon(url: string, mime?: string): EventDoc['icon'] {
  const u = url.toLowerCase()
  const m = (mime || '').toLowerCase()

  if (m.includes('pdf') || u.endsWith('.pdf')) return 'pdf'
  if (m.includes('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(u)) return 'img'
  if (u.includes('docs.google.com/document')) return 'doc'
  if (u.includes('docs.google.com/spreadsheets')) return 'sheet'
  if (u.includes('docs.google.com/presentation')) return 'slide'

  return 'link'
}

// Genera preview si és possible
function toPreviewUrl(url: string): string | undefined {
  const u = url.toLowerCase()

  // Google Drive → format preview
  const m = /\/file\/d\/([^/]+)\//.exec(url)
  if (m?.[1]) return `https://drive.google.com/file/d/${m[1]}/preview`

  if (u.includes('docs.google.com/document')) return url.replace(/\/edit.*$/, '/preview')
  if (u.includes('docs.google.com/spreadsheets')) return url.replace(/\/edit.*$/, '/preview')
  if (u.includes('docs.google.com/presentation')) return url.replace(/\/edit.*$/, '/preview')

  if (u.endsWith('.pdf')) return url

  return undefined
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    // 🔥 Agafem l'esdeveniment només de stage_verd
    const snap = await db.collection('stage_verd').doc(id).get()

    if (!snap.exists) {
      return NextResponse.json({ docs: [] }, { status: 404 })
    }

    const data = snap.data() || {}

    // 🔍 Tots els camps que comencen per fileN
    const fileEntries = Object.entries(data).filter(([key, val]) =>
      key.toLowerCase().startsWith('file') &&
      typeof val === 'string' &&
      val.length > 0
    )

    // 📚 Construcció EventDoc[]
    const docs: EventDoc[] = fileEntries
      .sort((a, b) => {
        const ai = parseInt(a[0].replace('file', ''), 10)
        const bi = parseInt(b[0].replace('file', ''), 10)
        return ai - bi
      })
      .map(([key, url]) => {
        const icon = detectIcon(url as string)
        return {
          id: key,
          title: decodeURIComponent((url as string).split('/').pop() || key),
          source: 'firestore-file',
          url: url as string,
          previewUrl: toPreviewUrl(url as string),
          icon,
        }
      })

    return NextResponse.json({ docs })
  } catch (err) {
    console.error('❌ Error a /events/[id]/documents:', err)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
