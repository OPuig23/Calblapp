// src/app/api/events/[id]/documents/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { getDownloadURL } from 'firebase-admin/storage'
import { storageAdmin } from '@/lib/firebaseAdmin'

export type EventDoc = {
  id: string
  title: string
  source: 'firestore-file' | 'firestore-link'
  url: string
  icon: 'pdf' | 'img' | 'doc' | 'sheet' | 'slide' | 'link'
}

function detectIcon(name: string): EventDoc['icon'] {
  const n = name.toLowerCase()
  if (n.endsWith('.pdf')) return 'pdf'
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(n)) return 'img'
  if (n.endsWith('.doc') || n.endsWith('.docx')) return 'doc'
  if (n.endsWith('.xls') || n.endsWith('.xlsx')) return 'sheet'
  if (n.endsWith('.ppt') || n.endsWith('.pptx')) return 'slide'
  return 'link'
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith('/')
}

function filenameFromPath(path: string, fallback: string) {
  try {
    const cleaned = (path.split('?')[0] || '').split('/').filter(Boolean)
    const last = cleaned[cleaned.length - 1]
    return decodeURIComponent(last || fallback)
  } catch {
    return fallback
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const url = new URL(req.url)
    const eventCode = url.searchParams.get('eventCode')

    let snap = await db.collection('stage_verd').doc(id).get()

    if (!snap.exists && eventCode) {
      const alt = await db
        .collection('stage_verd')
        .where('code', '==', eventCode)
        .limit(1)
        .get()
      if (!alt.empty) snap = alt.docs[0]
    }

    if (!snap.exists) {
      return NextResponse.json({ docs: [] })
    }

    const data = snap.data() || {}

    const files = Object.entries(data).filter(
      ([k, v]) => k.startsWith('file') && typeof v === 'string' && v.length > 0
    )

    const bucket = storageAdmin.bucket()

    const docs: EventDoc[] = []

    for (const [key, rawPath] of files) {
      const path = String(rawPath)
      const filename = filenameFromPath(path, key)

      // si ja tenim una URL absoluta/relativa (SharePoint, etc.), la retornem directament
      if (looksLikeUrl(path)) {
        docs.push({
          id: key,
          title: filename,
          source: 'firestore-link',
          url: path,
          icon: detectIcon(filename),
        })
        continue
      }

      try {
        const file = bucket.file(path)
        const publicUrl = await getDownloadURL(file)

        docs.push({
          id: key,
          title: filename,
          source: 'firestore-file',
          url: publicUrl,
          icon: detectIcon(filename),
        })
      } catch {
        // si un fitxer no existeix o no és una ruta de Storage, el saltem
      }
    }

    return NextResponse.json({ docs })
  } catch (err) {
    console.error('❌ documents error', err)
    return NextResponse.json({ docs: [] }, { status: 500 })
  }
}
