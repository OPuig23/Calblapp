// src/app/api/events/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { google } from 'googleapis'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { normalizeRole } from '@/lib/roles'
import { firestore as db } from '@/services/db'

interface SessionUser {
  id?: string
  role?: string
  department?: string
  name?: string
  email?: string
}

/**
 * Representa un event construït a partir del Google Calendar.
 * És la base que farem servir a la UI.
 */
type BuiltEvent = {
  id: string
  summary: string
  start: string
  end: string
  location: string
  locationShort: string
  mapsUrl: string
  pax: number
  state: 'pending'
  name: string
  eventCode: string
  commercial: string
  isResponsible: boolean
}

// 🔹 Tipus mínim per documents de Firestore en quadrants
interface QuadrantEventDoc {
  eventName?: string
  responsable?: {
    name?: string
    responsableName?: string
  }
}

const deptMap: Record<string, string> = {
  logistica: 'quadrantsLogistica',
  cuina: 'quadrantsCuina',
  serveis: 'quadrantsServeis',
  transports: 'quadrantsTransports',
}

const calendarAuth = new google.auth.JWT(
  process.env.FIREBASE_CLIENT_EMAIL!,
  undefined,
  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/calendar.readonly']
)
const calendar = google.calendar({ version: 'v3', auth: calendarAuth })

function parseCommercial(description?: string): string {
  if (!description) return ''
  const desc = String(description)
    .replace(/\u00A0/g, ' ')
    .replace(/[–—]/g, '-')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  const m = desc.match(/(?:^|\r?\n)\s*(?:comercial|com)\s*[:\-]\s*([^\n\r]+)/i)
  return (m?.[1] || '').trim()
}

function shortLocation(s?: string): string {
  const src = (s || '').trim()
  if (!src) return ''
  const i = src.search(/[,\|\.]/)
  const head = i === -1 ? src : src.slice(0, i)
  return head.trim()
}

function toMapsUrl(s?: string): string {
  const q = (s || '').trim()
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

function extractNameAndCode(summary: string): { name: string; code: string } | null {
  const s = String(summary || '').trim()
  let m = s.match(/^(.*?)(?:#\s*)?([A-Za-z]{1,2}\d{5,})\s*$/)
  if (m) {
    const name = m[1].replace(/[–—-]\s*$/,'').trim()
    return { name, code: m[2].toUpperCase() }
  }
  m = s.match(/(?:#\s*)?([A-Za-z]{1,2}\d{5,})/)
  if (m) {
    const code = m[1].toUpperCase()
    const name = s.replace(m[0], '').replace(/[–—-]\s*$/,'').trim()
    return { name, code }
  }
  return null
}

const norm = (s?: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ events: [], responsables: {} }, { status: 401 })
  }

  const user = session.user as SessionUser

  const role = normalizeRole(user.role)
  const userName = (user.name || user.email || '').toString().trim()
  const userId = user.id || null
  const userDept = user.department || ''

  const { searchParams } = new URL(request.url)
  const fromStr = searchParams.get('from')
  const toStr   = searchParams.get('to')
  if (!fromStr || !toStr) {
    return NextResponse.json({ events: [], responsables: {} })
  }

  // 1. Llegim esdeveniments de Google Calendar
  const calRes = await calendar.events.list({
    calendarId:   process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID!,
    timeMin:      new Date(fromStr).toISOString(),
    timeMax:      new Date(toStr).toISOString(),
    singleEvents: true,
  })
  const rawEvents = calRes.data.items || []

  // 2. Construïm estructura base
  const built: BuiltEvent[] = rawEvents
    .map((ev): BuiltEvent | null => {
      const summary = ev.summary || ''
      const parsed = extractNameAndCode(summary)
      if (!parsed) return null

      const commercial = parseCommercial(ev.description || '')
      const pax = Number((summary.match(/(\d+)\s*pax/i) || [])[1] || 0)
      const location = ev.location || ''

      return {
        id: ev.id || '',
        summary,
        start: ev.start?.dateTime || ev.start?.date || '',
        end: ev.end?.dateTime || ev.end?.date || '',
        location,
        locationShort: shortLocation(location),
        mapsUrl: toMapsUrl(location),
        pax,
        state: 'pending',
        name: parsed.name,
        eventCode: parsed.code,
        commercial,
        isResponsible: false,
      }
    })
    .filter((e): e is BuiltEvent => e !== null)

  // 3. Filtre per Treballador
  let events = built
  if (role === 'treballador') {
    const needle = norm(userName)
    events = built.filter(e => {
      const s = norm(e.summary)
      return needle && s.includes(needle)
    })

    // 4. Marquem isResponsible segons quadrants
    if (userId && userDept && events.length > 0) {
      const collName = deptMap[userDept.toLowerCase()]
      if (collName) {
        const snap = await db.collection(collName).get()
        snap.forEach(doc => {
          const data = doc.data() as unknown as QuadrantEventDoc
          const evIdx = events.findIndex(e => {
            const evNorm = norm(e.summary)
            const nameNorm = norm(data.eventName)
            return (
              (data.eventName && nameNorm.includes(e.eventCode.toLowerCase())) ||
              nameNorm === evNorm
            )
          })
          if (evIdx !== -1) {
            const resp = data.responsable
            if (
              norm(resp?.name) === norm(userName) ||
              norm(resp?.responsableName) === norm(userName)
            ) {
              events[evIdx].isResponsible = true
            }
          }
        })
      }
    }
  }

  const responsables = {} as Record<string, string[]>
  return NextResponse.json({ events, responsables })
}
