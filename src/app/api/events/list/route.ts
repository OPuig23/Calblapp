//file: src/app/api/events/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

/* ================== Config ================== */
const CALENDAR_ID =
  process.env.GCAL_EVENTS_CALENDAR_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || ''
const GOOGLE_API_KEY =
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ''

/* ================== Utils ================== */
const unaccent = (s?: string | null) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normalize = (s?: string | null) => unaccent(s).toLowerCase().trim()
const normCode = (s?: string | null) =>
  (s ? unaccent(String(s)).toLowerCase().trim().replace(/\s+/g, '') : '')
const dayKey = (iso?: string) => (iso || '').slice(0, 10)

const addDaysUTC = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function normalizeColId(id: string): string {
  const rest = id.replace(/^quadrants?/i, '')
  return rest
    .replace(/[_\-\s]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Deriva la línia de negoci segons codi/summary
const lnFromCodeOrSummary = (code?: string | null, summary?: string | null) => {
  const src = String(code || '').trim() || String(summary || '').trim()
  const m = src.match(/([A-Za-z])/)
  const ch = (m?.[1] || '').toUpperCase()
  switch (ch) {
    case 'E':
      return { lnKey: 'empresa', lnLabel: 'Empresa' }
    case 'C':
      return { lnKey: 'casaments', lnLabel: 'Casaments' }
    case 'F':
      return { lnKey: 'foodlovers', lnLabel: 'Foodlovers' }
    case 'A':
      return { lnKey: 'agenda', lnLabel: 'Agenda' }
    default:
      return { lnKey: 'altres', lnLabel: 'Altres' }
  }
}

/* ================== Collections map ================== */
const COLS_MAP: Record<string, string> = {}
let COLS_LOADED = false

async function loadCollectionsMap() {
  if (COLS_LOADED) return
  const cols = await db.listCollections()
  cols.forEach(c => {
    const key = normalizeColId(c.id)
    if (key) COLS_MAP[key] = c.id
  })
  COLS_LOADED = true
  console.log('[events/list] 🔄 Collections map carregat:', COLS_MAP)
}

async function resolveColForDept(dept: string): Promise<string | undefined> {
  await loadCollectionsMap()
  const normDept = normalize(dept)
  let result = COLS_MAP[normDept]

  if (!result) {
    const alt = Object.entries(COLS_MAP).find(([k]) => k.includes(normDept))
    if (alt) {
      result = alt[1]
      console.log('[resolveColForDept] ⚠️ Fallback match:', { dept, normDept, result })
    } else {
      console.log('[resolveColForDept] ❌ No col·lecció per dept:', { dept, normDept })
    }
  }
  return result
}

/* ================== Quadrants query ================== */
async function fetchQuadrantsRange(coll: string, start: string, end: string) {
  const col = db.collection(coll)
  const s = start.slice(0, 10)
  const e = end.slice(0, 10)
  const safeGet = (p: any) =>
    p.catch(() => ({ empty: true, forEach: () => {} } as any))

  const [q1, q2, q3] = await Promise.all([
    safeGet(col.where('startDate', '>=', s).where('startDate', '<=', e).get()),
    safeGet(col.where('endDate', '>=', s).where('endDate', '<=', e).get()),
    safeGet(col.where('date', '>=', s).where('date', '<=', e).get())
  ])

  const out: any[] = []
  for (const snap of [q1, q2, q3]) {
    if (!snap || snap.empty) continue
    snap.forEach((doc: any) => out.push({ id: doc.id, ...doc.data() }))
  }
  console.log(`[events/list] 📂 ${coll} → ${out.length} docs`)
  return out
}

/* ================== Roles ================== */
type Role = 'admin' | 'direccio' | 'cap' | 'treballador'
function roleFrom(token: any): Role {
  const raw = token?.role ?? token?.userRole ?? token?.user?.role ?? ''
  const r = normalize(raw)
  if (r === 'admin') return 'admin'
  if (r === 'direccio' || r.includes('dir')) return 'direccio'
  if (r === 'cap' || r.includes('head')) return 'cap'
  return 'treballador'
}

/* ================== Handler ================== */
export async function GET(req: NextRequest) {
  try {
    if (!CALENDAR_ID || !GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Falten variables de Google Calendar.' },
        { status: 500 }
      )
    }

    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    const scope = url.searchParams.get('scope') as 'all' | 'mine' | null
    const qsDeptRaw = url.searchParams.get('department') || ''
    let qsDept = normalize(qsDeptRaw)
    if (qsDept === 'unused') qsDept = ''

    if (!start || !end) {
      return NextResponse.json(
        { error: 'Falten start i end' },
        { status: 400 }
      )
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role: Role = roleFrom(token)
    const userName: string = String(
      (token as any).name || (token as any).user?.name || ''
    )
    const sessDept = normalize(
      (token as any).department ??
      (token as any).userDepartment ??
      (token as any).dept ??
      (token as any).departmentName ??
      ''
    )

    console.log('[events/list] 🟢 Token info:', {
      role,
      sessDept,
      qsDept,
      scope,
      userName
    })

    /* ==== Dept policy ==== */
    let deptsToUse: string[] = []
    if (role === 'cap') {
      if (!sessDept) {
        return NextResponse.json(
          { events: [], responsables: [], locations: [] },
          { status: 200 }
        )
      }
      deptsToUse = [sessDept]
    } else if (role === 'admin' || role === 'direccio') {
      if (qsDept && qsDept !== 'total') {
        deptsToUse = [qsDept]
      } else {
        deptsToUse = [] // tots els departaments
      }
    }

    /* ==== Google Calendar ==== */
    const timeMin = `${start}T00:00:00.000Z`
    const timeMaxExclusive = addDaysUTC(end, 1)

    const gUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        CALENDAR_ID
      )}` +
      `/events?key=${encodeURIComponent(GOOGLE_API_KEY)}` +
      `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
        timeMaxExclusive
      )}` +
      `&singleEvents=true&orderBy=startTime`

    const resp = await fetch(gUrl, { cache: 'no-store' })
    if (!resp.ok)
      throw new Error(`Google Calendar ${resp.status}: ${await resp.text()}`)
    const data = await resp.json()

    const base = (data.items || []).map((ev: any) => {
      const startISO =
        ev.start?.dateTime ||
        (ev.start?.date ? `${ev.start.date}T00:00:00.000Z` : null)
      const endISO =
        ev.end?.dateTime ||
        (ev.end?.date ? `${ev.end.date}T00:00:00.000Z` : null)
      const priv = ev.extendedProperties?.private || {}
      const shared = ev.extendedProperties?.shared || {}
      const pax = Number(priv.pax ?? shared.pax ?? 0) || 0
      const codeFromSummary =
        (ev.summary || '').match(/#\s*([A-Za-z0-9-]+)/)?.[1] || null
      const eventCode = priv.code || codeFromSummary
      const { lnKey, lnLabel } = lnFromCodeOrSummary(eventCode, ev.summary)

      return {
        id: ev.id,
        summary: ev.summary || '(Sense títol)',
        start: startISO,
        end: endISO,
        day: startISO ? dayKey(startISO) : '',
        location: ev.location || '',
        pax,
        eventCode,
        htmlLink: ev.htmlLink || null,
        lnKey,
        lnLabel
      }
    })

    const filteredByRange = base.filter(ev => {
      if (!ev.start) return false
      const s = new Date(ev.start).toISOString()
      return s >= timeMin && s < timeMaxExclusive
    })

    /* ==== Quadrants ==== */
    await loadCollectionsMap()
    let collNames: string[] = []
    if (deptsToUse.length > 0) {
      collNames = (
        await Promise.all(deptsToUse.map(resolveColForDept))
      ).filter(Boolean) as string[]
    } else {
      collNames = Object.values(COLS_MAP).filter(c =>
        c.toLowerCase().startsWith('quadrants')
      )
    }

    /* ==== Responsables i estats ==== */
    const responsablesSet = new Set<string>()
    const responsablesMap = new Map<string, Set<string>>() // codi → responsables
    const stateMap = new Map<string, 'pending' | 'draft' | 'confirmed'>()
    const responsablesDetailedSet = new Set<string>()
    const myEvents = new Set<string>() // 🔹 Conjunt d'esdeveniments propis (treballador)

    for (const coll of collNames) {
      const rows = await fetchQuadrantsRange(coll, start, end)
      const dept = normalizeColId(coll)
      let foundInColl: string[] = []

      for (const q of rows) {
        if (q?.responsable?.name && q?.code) {
          const name = String(q.responsable.name).trim()
          const c = normCode(String(q.code))

          if (!responsablesMap.has(c)) responsablesMap.set(c, new Set<string>())
          responsablesMap.get(c)!.add(name)

          responsablesSet.add(name)
          responsablesDetailedSet.add(JSON.stringify({ name, department: dept }))
          foundInColl.push(name)

          // 🔹 Si usuari és treballador, marca si surt en aquest quadrant
          const allNames = [
            q?.responsable?.name,
            ...(q?.conductors || []).map((c: any) => c.name),
            ...(q?.treballadors || []).map((t: any) => t.name),
          ].filter(Boolean)

          if (role === 'treballador' && allNames.some(n => normalize(n) === normalize(userName))) {
            if (q?.code) myEvents.add(normCode(String(q.code)))
            if (q?.eventId) myEvents.add(String(q.eventId))

            // 🔹 Afegim també marca si és responsable
            const isResp = normalize(q?.responsable?.name) === normalize(userName)
            console.log('[isResponsible debug]', {
              userName,
              qCode: q?.code,
              qEventId: q?.eventId,
              qResponsable: q?.responsable?.name,
              matched: isResp
            })
            if (isResp) {
              if (q?.code) myEvents.add(`RESP:${normCode(String(q.code))}`)
              if (q?.eventId) myEvents.add(`RESP:${String(q.eventId)}`)
            }
          }

          stateMap.set(c, q?.status === 'confirmed' ? 'confirmed' : 'draft')
        }
      }

      console.log(
        `[events/list] 📌 Responsables trobats a ${coll} (${dept}):`,
        foundInColl
      )
    }

    /* ==== Enriquiment ==== */
    const enriched = filteredByRange.map(ev => {
      const keyByCode = normCode(ev.eventCode || '')
      const responsablesForCode = Array.from(responsablesMap.get(keyByCode) || [])
      const responsableName = responsablesForCode.join(', ')
      const state = stateMap.get(keyByCode) || 'pending'

      console.log('[enriched] Match event', {
        evId: ev.id,
        evCode: ev.eventCode,
        evSummary: ev.summary,
        keyByCode,
        responsablesForCode,
        finalResp: responsableName
      })

      return { ...ev, responsableName, state }
    })

    /* ==== Filtrat final ==== */
    let finalEvents = enriched
    if (role === 'treballador') {
      finalEvents = enriched
        .filter(ev =>
          myEvents.has(normCode(ev.eventCode || '')) || myEvents.has(ev.id)
        )
        .map(ev => {
          const isResp =
            myEvents.has(`RESP:${normCode(ev.eventCode || '')}`) ||
            myEvents.has(`RESP:${ev.id}`)

          console.log('[finalEvents check]', {
            evCode: ev.eventCode,
            evId: ev.id,
            isResp
          })

          return { ...ev, isResponsible: isResp }
        })
    } else {
      finalEvents = enriched.map(ev => ({ ...ev, isResponsible: false }))
    }

    return NextResponse.json(
      {
        events: finalEvents,
        responsables: Array.from(responsablesSet),
        responsablesDetailed: Array.from(responsablesDetailedSet).map(r =>
          JSON.parse(r)
        ),
        locations: Array.from(new Set(finalEvents.map(e => e.location).filter(Boolean)))
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('[api/events/list] ❌ error', err)
    return NextResponse.json(
      { error: err?.message || 'Internal Error' },
      { status: 500 }
    )
  }
}
 