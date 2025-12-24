// src/app/api/transports/available/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

/* =========================
   HELPERS
========================= */
const toDateTime = (date: string, time?: string) =>
  new Date(`${date}T${time || '00:00'}:00`)

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd

/* =========================
   TYPES
========================= */
type Vehicle = {
  id: string
  plate: string
  type: string
}

type Occupation = {
  plate: string
  start: Date
  end: Date
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
  try {
    const { startDate, startTime, endDate, endTime } = await req.json()

    if (!startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    const reqStart = toDateTime(startDate, startTime)
    const reqEnd   = toDateTime(endDate, endTime)

    /* =========================
       1) VEHICLES (catàleg)
    ========================= */
    const vehSnap = await db.collection('transports').get()

    const vehicles: Vehicle[] = vehSnap.docs
      .map(d => ({
        id: d.id,
        plate: d.data().plate || d.data().matricula || '',
        type: d.data().type || '',
      }))
      .filter(v => Boolean(v.plate))

    /* =========================
       2) OCUPACIONS REALS
       👉 NOMÉS DES DE QUADRANTS
    ========================= */
    const quadrantCols = [
      'quadrantsLogistica',
      'quadrantsServeis',
      'quadrantsCuina',
      'quadrantsEmpresa',
    ]

    const occupations: Occupation[] = []

    for (const col of quadrantCols) {
      const snap = await db.collection(col).get()

      snap.docs.forEach(doc => {
        const q = doc.data()
        const conductors = Array.isArray(q.conductors) ? q.conductors : []

        conductors.forEach((c: any) => {
          if (!c?.plate || !c?.startDate || !c?.startTime) return

          occupations.push({
            plate: c.plate,
            start: toDateTime(c.startDate, c.startTime),
            end: toDateTime(
              c.endDate || c.startDate,
              c.endTime || c.startTime
            ),
          })
        })
      })
    }

    /* =========================
       3) DISPONIBILITAT
    ========================= */
    const result = vehicles.map(v => {
      const busy = occupations.some(o =>
        o.plate === v.plate &&
        overlaps(reqStart, reqEnd, o.start, o.end)
      )

      return {
        id: v.id,
        plate: v.plate,
        type: v.type,
        available: !busy,
      }
    })

    return NextResponse.json({ vehicles: result })
  } catch (e) {
    console.error('[transports/available]', e)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
