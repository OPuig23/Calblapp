// file: src/app/api/reports/vehicles/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const isIndexError = (err: any) =>
  err?.code === 9 || String(err?.message || '').toLowerCase().includes('requires an index')

const COST_PER_KM = 0.11 * 1.2 // 11 l/100km * 1,2 €/l ≃ 0,132 €/km

type DriverRow = {
  name: string
  assignments: number
  plates: Set<string>
}

type VehicleRow = {
  plate: string
  type: string
  assignments: number
  events: Set<string>
  conductors: Set<string>
  distanceKm: number
}

async function listQuadrantCollections() {
  const cols = await db.listCollections()
  return cols.map(c => c.id).filter(id => id.toLowerCase().startsWith('quadrants'))
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const eventFilter = (searchParams.get('event') || '').trim().toLowerCase()
    const lineFilter = (searchParams.get('line') || '').trim().toLowerCase()

    if (!start || !end) {
      return NextResponse.json({ success: false, error: 'Falten start/end (YYYY-MM-DD)' }, { status: 400 })
    }

    const colNames = await listQuadrantCollections()

    const warnings: string[] = []
    const vehicles = new Map<string, VehicleRow>()
    const drivers = new Map<string, DriverRow>()
    const eventOptions = new Map<string, string>()
    const lineOptions = new Set<string>()

    for (const colName of colNames) {
      const ref = db.collection(colName)
      let snap
      try {
        snap = await ref.where('startDate', '<=', end).where('endDate', '>=', start).get()
      } catch (err: any) {
        if (isIndexError(err)) {
          const msg = String(err?.message || '')
          const link = msg.match(/https?:\/\/\S+/)?.[0]
          warnings.push(
            `Falta un index startDate/endDate per a la col·leccio ${colName}. ${
              link ? `Crea'l o revisa'l: ${link}` : 'Revisa la consola de Firestore.'
            }`
          )
          continue
        }
        throw err
      }

      if (snap.empty) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        try {
          snap = await ref.where('startDate', '<=', endDate).where('endDate', '>=', startDate).get()
        } catch (err: any) {
          if (isIndexError(err)) {
            const msg = String(err?.message || '')
            const link = msg.match(/https?:\/\/\S+/)?.[0]
            warnings.push(
              `Falta un index startDate/endDate per a la col·leccio ${colName}. ${
                link ? `Crea'l o revisa'l: ${link}` : 'Revisa la consola de Firestore.'
              }`
            )
            continue
          }
          throw err
        }
      }

      if (snap.empty) continue

      snap.forEach(doc => {
        const d = doc.data() as any
        const eventId = d.code || d.eventCode || d.eventId || doc.id
        const eventName = d.eventName || d.name || d.title || d.summary || ''
        const ln = (d.LN || d.ln || d.line || d.lineaNegoci || '').toString()
        const distanceKm = Number(d.distanceKm || 0) // anada+tornada si s'ha pre-calculat

        if (lineFilter && ln.toLowerCase() !== lineFilter) return
        if (
          eventFilter &&
          !String(eventId).toLowerCase().includes(eventFilter) &&
          !String(eventName).toLowerCase().includes(eventFilter)
        )
          return

        if (ln) lineOptions.add(ln)
        if (eventId) eventOptions.set(String(eventId), eventName || String(eventId))

        const conductors = Array.isArray(d.conductors) ? d.conductors : []
        conductors.forEach((c: any) => {
          const plate = c?.plate || c?.matricula || ''
          const type = c?.vehicleType || c?.type || ''
          const name = c?.name || c?.conductor || ''

          if (!plate && !name) return

          const vehicleKey = plate || `${eventId}-${type || 'vehicle'}`
          const vCurrent = vehicles.get(vehicleKey) || {
            plate: plate || 'sense matrícula',
            type,
            assignments: 0,
            events: new Set<string>(),
            conductors: new Set<string>(),
            distanceKm: 0,
          }
          vCurrent.assignments += 1
          if (eventId) vCurrent.events.add(String(eventId))
          if (name) vCurrent.conductors.add(String(name))
          vCurrent.type = vCurrent.type || type
          if (distanceKm > 0) vCurrent.distanceKm += distanceKm
          vehicles.set(vehicleKey, vCurrent)

          if (name) {
            const dCurrent = drivers.get(String(name)) || { name: String(name), assignments: 0, plates: new Set<string>() }
            dCurrent.assignments += 1
            if (plate) dCurrent.plates.add(String(plate))
            drivers.set(String(name), dCurrent)
          }
        })
      })
    }

    const vehicleRows = Array.from(vehicles.values())
    const driverRows = Array.from(drivers.values())

    return NextResponse.json({
      success: true,
      vehicles: vehicleRows.map(v => ({
        ...v,
        cost: Number(v.distanceKm || 0) * COST_PER_KM,
      })),
      drivers: driverRows,
      options: {
        events: Array.from(eventOptions.entries()).map(([id, name]) => ({ id, name })),
        lines: Array.from(lineOptions).sort(),
      },
      warnings,
    })
  } catch (e: unknown) {
    console.error('[reports/vehicles] error:', e)
    const msg = e instanceof Error ? e.message : 'Error intern'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
