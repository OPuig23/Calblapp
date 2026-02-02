//file: src/app/api/transports/assignacions/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const DEPTS = ['logistica', 'cuina', 'empresa']
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Item = {
  eventCode: string
  day: string
  eventStartTime: string
  eventEndTime: string
  eventName: string
  location: string
  pax: number
  status: 'draft' | 'confirmed'
  rows: any[]
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ items: [] })
    }

    /* =========================
       1) ESDEVENIMENTS BASE
    ========================= */
    const eventsSnap = await db
      .collection('stage_verd')
      .where('DataInici', '>=', start)
      .where('DataInici', '<=', end)
      .get()

    const map = new Map<string, Item>()

    eventsSnap.docs.forEach(doc => {
      const e = doc.data()
      if (!e?.code) return

      map.set(String(e.code), {
        eventCode: String(e.code),
        day: e.DataInici || '',
        eventStartTime: e.HoraInici || '',
        eventEndTime: e.HoraFi || '',
        eventName: e.NomEvent || '—',
        location: e.Ubicacio || '—',
        pax: Number(e.NumPax || 0),
        status: 'draft',
        rows: [],
      })
    })

    /* =========================
       2) QUADRANTS → FILTRAT BO
    ========================= */
    const visibleEvents = new Set<string>()

    for (const dept of DEPTS) {
      const col = `quadrants${cap(dept)}`

      const snap = await db
        .collection(col)
        .where('startDate', '>=', start)
        .where('startDate', '<=', end)
        .get()

      snap.docs.forEach(doc => {
        const q = doc.data()
        const code = String(q?.code || '')
        if (!map.has(code)) return

        const hasDrivers =
          Array.isArray(q.conductors) && q.conductors.length > 0

        const hasDemand =
          Boolean(q.transportRequested) ||
          Number(q.numDrivers || 0) > 0

        // ❌ NO entra a assignacions
        if (!hasDrivers && !hasDemand) return

        visibleEvents.add(code)

        const item = map.get(code)!

        // status (draft / confirmed)
        if (q.status === 'confirmed') {
          item.status = 'confirmed'
        }

        // conductors → files
        if (hasDrivers) {
          q.conductors.forEach((c: any) => {
            item.rows.push({
              id: c.id || `${dept}-${Math.random()}`,
              department: dept,
              name: c.name || '',
              plate: c.plate || '',
              vehicleType: c.vehicleType || '',
              startDate: c.startDate ?? q.startDate ?? '',
              endDate: c.endDate ?? q.endDate ?? q.startDate ?? '',
              startTime: c.startTime ?? q.startTime ?? '',
              arrivalTime: c.arrivalTime ?? q.arrivalTime ?? '',
              endTime: c.endTime ?? q.endTime ?? '',
            })
          })
        }
      })
    }

    /* =========================
       3) SORTIDA FINAL
       👉 només visibles
    ========================= */
    const items = Array.from(map.values())
      .filter(i => visibleEvents.has(i.eventCode))
      .sort((a, b) => {
        if (a.day !== b.day) return a.day.localeCompare(b.day)
        return a.eventStartTime.localeCompare(b.eventStartTime)
      })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[transports/assignacions]', err)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
