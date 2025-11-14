// src/app/api/events/personnel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { fetchGoogleEventById } from '@/services/googleCalendar'
import { firestoreAdmin } from '@/lib/firebaseAdmin'


export const runtime = 'nodejs'

const unaccent = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s?: string | null) => unaccent(String(s || '')).toLowerCase().trim()
const dayKey = (iso?: string | null) => (iso || '').slice(0, 10)
const uniqBy = <T, K extends string | number>(arr: T[], key: (x: T) => K) => {
  const m = new Map<K, T>()
  for (const it of arr) m.set(key(it), it)
  return Array.from(m.values())
}
const chunk = <T>(arr: T[], size = 10) => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Tipos
type QRow = {
  department?: string
  code?: string
  eventId?: string
  eventName?: string
  startDate?: string
  meetingPoint?: string
  startTime?: string
  hour?: string
  convocatoria?: string
  responsableName?: string
  conductors?: Array<{ name?: string; meetingPoint?: string; time?: string; hour?: string }>
  treballadors?: Array<{ name?: string; meetingPoint?: string; time?: string; hour?: string }>
  workers?: Array<{ name?: string; meetingPoint?: string; time?: string; hour?: string }>
}

type PersonDTO = {
  name: string
  role: 'responsable' | 'conductor' | 'treballador'
  department?: string
  meetingPoint?: string
  time?: string
  phone?: string
}

type PersonnelDoc = {
  name?: string
  phone?: string
  mobile?: string
  tel?: string
  telephone?: string
}

// ⚡️ Tipo auxiliar para snapshots seguros
type SafeSnap<T> =
  | FirebaseFirestore.QuerySnapshot<T>
  | { empty: true; forEach: (cb: (d: { data: () => T }) => void) => void }
  | null

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const eventId = url.searchParams.get('eventId')
    if (!eventId) return NextResponse.json({ error: 'Falta eventId' }, { status: 400 })

    const ev = await fetchGoogleEventById(eventId)
    if (!ev) return NextResponse.json({ error: 'Esdeveniment no trobat' }, { status: 404 })

    const summary = ev.summary || ''
    const [beforeHash, codePart] = summary.split('#')
    const code = (codePart || '').trim()
    const dateKey = dayKey(ev.start?.dateTime || ev.start?.date || null)
    const eventNameNorm = norm(beforeHash)

    const colls = [
      'quadrantsServeis',
      'quadrantsLogistica',
      'quadrantsCuina',
      'quadrantsProduccio',
      'quadrantsComercial',
    ]
    const rows: QRow[] = []

    for (const coll of colls) {
      const ref = db.collection(coll)

      const emptySnap: SafeSnap<Record<string, unknown>> = {
        empty: true,
        forEach: () => {}
      }

      const [byId, byCode, byDate] = await Promise.all([
        ref.where('eventId', '==', eventId).get().catch(() => emptySnap),
        code
          ? ref.where('code', '==', code).get().catch(() => emptySnap)
          : Promise.resolve(emptySnap),
        dateKey
          ? ref.where('startDate', '==', dateKey).get().catch(() => emptySnap)
          : Promise.resolve(emptySnap),
      ])

      const push = (snap: SafeSnap<Record<string, unknown>>) => {
        if (!snap || snap.empty) return
        snap.forEach((d) => rows.push(d.data() as unknown as QRow))
      }

      push(byId as SafeSnap<Record<string, unknown>>)
      push(byCode as SafeSnap<Record<string, unknown>>)
      push(byDate as SafeSnap<Record<string, unknown>>)
    }

    const normCode = (s?: string | null) =>
      (s ? unaccent(String(s)).toLowerCase().trim().replace(/\s+/g, '') : '')

    const filtered = rows.filter((r) => {
      if (r.eventId && r.eventId === eventId) return true
      if (code && r.code && normCode(r.code) === normCode(code)) return true
      if (r.eventName && norm(r.eventName) === eventNameNorm) return true
      return false
    })

    const people: PersonDTO[] = []
    for (const q of filtered) {
      const dept = q.department
      const qMeeting = q.meetingPoint
      const qTime = q.startTime || q.hour || q.convocatoria

      if (q.responsableName) {
        people.push({
          name: q.responsableName,
          role: 'responsable',
          department: dept,
          meetingPoint: qMeeting,
          time: qTime
        })
      }

      const each = (
        arr: Array<{ name?: string; meetingPoint?: string; time?: string; hour?: string }> | undefined,
        role: PersonDTO['role']
      ) => {
        if (!Array.isArray(arr)) return
        for (const p of arr) {
          const name = (p?.name || '').trim()
          if (!name) continue
          people.push({
            name,
            role,
            department: dept,
            meetingPoint: p.meetingPoint || qMeeting,
            time: p.time || p.hour || qTime,
          })
        }
      }

      each(q.conductors, 'conductor')
      each(q.treballadors, 'treballador')
      each(q.workers, 'treballador')
    }

    const dedup = uniqBy(people, (p) => `${p.name}|${p.role}`)

    const names = Array.from(new Set(dedup.map((p) => p.name)))
    const nameChunks = chunk(names, 10)
    const phoneMap = new Map<string, string>()

    for (const c of nameChunks) {
      const snap = await db.collection('personnel').where('name', 'in', c).get().catch(() => null)
      if (snap && !snap.empty) {
        snap.forEach((doc) => {
          const d = doc.data() as unknown as PersonnelDoc
          const phone = d.phone || d.mobile || d.tel || d.telephone
          if (d.name && phone) phoneMap.set(String(d.name), String(phone))
        })
      }
    }

    for (const c of nameChunks) {
      const missing = c.filter((n) => !phoneMap.has(n))
      if (missing.length === 0) continue
      const snap = await db.collection('users').where('name', 'in', missing).get().catch(() => null)
      if (snap && !snap.empty) {
        snap.forEach((doc) => {
          const d = doc.data() as unknown as PersonnelDoc
          const phone = d.phone || d.mobile || d.tel || d.telephone
          if (d.name && phone) phoneMap.set(String(d.name), String(phone))
        })
      }
    }

    const withPhones = dedup.map((p) => ({ ...p, phone: phoneMap.get(p.name) }))
    const responsables = withPhones.filter((p) => p.role === 'responsable')
    const conductors   = withPhones.filter((p) => p.role === 'conductor')
    const treballadors = withPhones.filter((p) => p.role === 'treballador')

    return NextResponse.json({
      event: { id: eventId, code, name: beforeHash.trim(), date: dateKey, location: ev.location || '' },
      responsables, conductors, treballadors,
    })
  } catch (err: unknown) {
    console.error('[api/events/personnel] error', err)
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
