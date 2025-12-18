//file: src/app/api/transports/assignacions/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const QUADRANT_DEPTS = ['logistica', 'serveis', 'cuina', 'empresa'] // prioritat de prefill
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Requested = {
  furgoneta: number
  camioPetit: number
  camioGran: number
  altres: number
  total: number
}

const emptyRequested = (): Requested => ({
  furgoneta: 0,
  camioPetit: 0,
  camioGran: 0,
  altres: 0,
  total: 0,
})

const addRequested = (a: Requested, b?: Partial<Requested>) => {
  if (!b) return
  a.furgoneta += Number(b.furgoneta || 0)
  a.camioPetit += Number(b.camioPetit || 0)
  a.camioGran += Number(b.camioGran || 0)
  a.altres += Number(b.altres || 0)
  a.total = a.furgoneta + a.camioPetit + a.camioGran + a.altres
}

function normalizeVehicleType(v?: string) {
  const x = (v || '').toString().toLowerCase().trim()
  if (!x) return ''
  if (x.includes('furg')) return 'furgoneta'
  if (x.includes('gran')) return 'camioGran'
  if (x.includes('petit')) return 'camioPetit'
  if (x.includes('camio')) return 'camioPetit'
  return x
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) return NextResponse.json({ items: [] })

    /* 1) ESDEVENIMENTS (stage_verd) */
    const eventsSnap = await db
      .collection('stage_verd')
      .where('DataInici', '>=', start)
      .where('DataInici', '<=', end)
      .get()

    const map = new Map<string, any>()

    eventsSnap.docs.forEach((d) => {
      const e = d.data()
      if (!e?.code) return
      const code = String(e.code)

      map.set(code, {
        eventCode: code,
        day: e.DataInici || '',
        eventStartTime: e.HoraInici || '--:--',
        eventEndTime: e.HoraFi || '',

        eventName: e.NomEvent || '—',
        location: e.Ubicacio || '—',
        service: e.Servei || '',
        pax: Number(e.NumPax || 0),

        requested: emptyRequested(),

        // ✅ dues fonts de files:
        prefillRows: [], // ve dels quadrants (conductors)
        rows: [],        // ve de transportAssignments (assignació final)
        assignedTotal: 0,
      })
    })

    /* 2) QUADRANTS: DEMANDA + PREFILL (conductors) */
    for (const dept of QUADRANT_DEPTS) {
      const col = `quadrants${cap(dept)}`

      const snap = await db
        .collection(col)
        .where('status', '==', 'confirmed')
        .where('startDate', '>=', start)
        .where('startDate', '<=', end)
        .get()

      snap.docs.forEach((d) => {
        const q = d.data()
        const code = String(q?.code || '')
        if (!code || !map.has(code)) return

        const item = map.get(code)

        // Demanda vehicles
        if (q.transportRequested) {
          addRequested(item.requested, q.transportRequested)
        } else if (q.numDrivers) {
          item.requested.camioPetit += Number(q.numDrivers)
          item.requested.total += Number(q.numDrivers)
        }

        // ✅ Prefill des de conductors del quadrant (si existeix)
        const conductors = Array.isArray(q.conductors) ? q.conductors : []
        for (const c of conductors) {
          item.prefillRows.push({
            id: `${dept}-${d.id}-${c?.id || c?.name || Math.random()}`,
            department: dept,
            name: c?.name || '',
            vehicleType: normalizeVehicleType(c?.vehicleType || ''),
            plate: c?.plate || '',
            departTime: c?.startTime || q?.startTime || '',
            returnTime: c?.endTime || q?.endTime || '',
            date: q?.startDate || item.day,
          })
        }
      })
    }

    /* 3) ASSIGNACIONS FINALS (transportAssignments) */
    const assSnap = await db.collection('transportAssignments').get()
    assSnap.docs.forEach((d) => {
      const code = d.id
      if (!map.has(code)) return
      const data = d.data()
      const item = map.get(code)

      item.rows = Array.isArray(data.rows) ? data.rows : []
      item.assignedTotal = item.rows.length
    })

  /* 4) RESOLUCIÓ DE FILES (assignacions vs prefill) */
for (const item of map.values()) {
  // Si hi ha assignacions guardades → manen
  if (Array.isArray(item.rows) && item.rows.length > 0) {
    item.assignedTotal = item.rows.length
    continue
  }

  // Si NO hi ha assignacions → usem prefill dels quadrants
  if (Array.isArray(item.prefillRows) && item.prefillRows.length > 0) {
    item.rows = item.prefillRows.map((r: any) => ({
      id: r.id,
      department: r.department,
      name: r.name,
      vehicleType: r.vehicleType,
      plate: r.plate,
      startDate: r.date,
      endDate: r.date,
      startTime: r.departTime,
      endTime: r.returnTime,
      __source: 'prefill',
    }))
    item.assignedTotal = item.rows.length
  } else {
    item.rows = []
    item.assignedTotal = 0
  }

  // netegem per no exposar-ho a la UI
  delete item.prefillRows
}

    /* 5) SORTIDA */
    const items = Array.from(map.values()).sort((a, b) => {
      if (a.day !== b.day) return a.day.localeCompare(b.day)
      return String(a.eventStartTime || '').localeCompare(String(b.eventStartTime || ''))
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[transports/assignacions]', err)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
