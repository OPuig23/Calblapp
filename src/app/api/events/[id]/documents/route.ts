// src/app/api/events/[id]/documents/route.ts
import { NextResponse } from 'next/server'
import { fetchGoogleEventById } from '@/services/googleCalendar'

// Tipus retornats a la UI
export type EventDoc = {
  id: string
  title: string
  mimeType?: string
  source: 'calendar-attachment' | 'description-link'
  url: string
  previewUrl?: string
  icon: 'pdf' | 'doc' | 'sheet' | 'slide' | 'img' | 'link'
}

// Google Calendar Event mínim tipat
interface GoogleCalendarAttachment {
  fileUrl: string
  title?: string
  mimeType?: string
}
interface GoogleCalendarEvent {
  attachments?: GoogleCalendarAttachment[]
  description?: string
}

const DRIVE_FILE_RE = /\/file\/d\/([^/]+)\//
const DRIVE_OPEN_ID_RE = /[\?&]id=([^&]+)/

function detectIcon(mime?: string, url?: string): EventDoc['icon'] {
  const u = (url || '').toLowerCase()
  const m = (mime || '').toLowerCase()
  if (m.includes('pdf') || u.endsWith('.pdf')) return 'pdf'
  if (m.includes('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(u)) return 'img'
  if (u.includes('docs.google.com/document')) return 'doc'
  if (u.includes('docs.google.com/spreadsheets')) return 'sheet'
  if (u.includes('docs.google.com/presentation')) return 'slide'
  return 'link'
}

function toPreviewUrl(url: string, mime?: string): string | undefined {
  const u = url.toLowerCase()
  const byFile = DRIVE_FILE_RE.exec(url)
  const byOpen = DRIVE_OPEN_ID_RE.exec(url)
  const fileId = byFile?.[1] || byOpen?.[1]
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`

  if (u.includes('docs.google.com/document')) return url.replace(/\/edit.*$/, '/preview')
  if (u.includes('docs.google.com/spreadsheets')) return url.replace(/\/edit.*$/, '/preview')
  if (u.includes('docs.google.com/presentation')) return url.replace(/\/edit.*$/, '/preview')

  if ((mime || '').includes('pdf') || u.endsWith('.pdf')) return url

  return undefined
}

function extractLinksFromText(text?: string): string[] {
  if (!text) return []
  const urls = new Set<string>()
  const re = /(https?:\/\/[^\s)\]]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    urls.add(m[1])
  }
  return Array.from(urls)
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const eventId = id

    const ev = (await fetchGoogleEventById(eventId)) as unknown as GoogleCalendarEvent | null
    if (!ev) {
      return NextResponse.json({ docs: [] }, { status: 404 })
    }

    const docs: EventDoc[] = []

    // 1) Adjunts del Calendar
    const atts: GoogleCalendarAttachment[] | undefined = ev.attachments
    if (atts?.length) {
      for (const a of atts) {
        const icon = detectIcon(a.mimeType, a.fileUrl)
        docs.push({
          id: a.fileUrl || a.title || Math.random().toString(36).slice(2),
          title: a.title || 'Adjunt',
          mimeType: a.mimeType,
          source: 'calendar-attachment',
          url: a.fileUrl,
          previewUrl: toPreviewUrl(a.fileUrl, a.mimeType),
          icon,
        })
      }
    }

    // 2) Enllaços dins la descripció
    const links: string[] = extractLinksFromText(ev.description)
    for (const url of links) {
      const title = url
        .replace(/^https?:\/\//, '')
        .replace(/[#\?].*$/, '')
        .slice(0, 60)
      const icon = detectIcon(undefined, url)
      docs.push({
        id: url,
        title,
        source: 'description-link',
        url,
        previewUrl: toPreviewUrl(url),
        icon,
      })
    }

    // Únics
    const unique: EventDoc[] = Object.values(
      docs.reduce<Record<string, EventDoc>>((acc, d) => {
        acc[d.id] = d
        return acc
      }, {})
    )

    return NextResponse.json({ docs: unique })
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
