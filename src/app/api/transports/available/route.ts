// ✅ src/app/api/transports/available/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`)

const overlaps = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA < endB && startB < endA

interface Vehicle {
  id: string
  plate?: string
  matricula?: string
  type?: string
  conductorId?: string | null
}

interface QuadrantVehicle {
  vehicleId: string
}

interface Quadrant {
  id: string
  vehicles?: QuadrantVehicle[]
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
}

export async function POST(req: Request) {
  try {
    const { startDate, startTime, endDate, endTime } = (await req.json()) as {
      startDate: string
      startTime: string
      endDate: string
      endTime: string
    }

    console.log('[API /transports/available] 📩 Body rebut:', {
      startDate, startTime, endDate, endTime,
    })

    if (!startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const start = toDateTime(startDate, startTime)
    const end   = toDateTime(endDate, endTime)

    // 1️⃣ Vehicles de Firestore
    const vehSnap = await db.collection('transports').get()
    const vehicles: Vehicle[] = vehSnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Vehicle, 'id'>),
    }))
    console.log('[API /transports/available] 🚚 Vehicles trobats:', vehicles.length)

    // 2️⃣ Quadrants de tots els departaments
    const quadrantCollections = ['quadrantsServeis', 'quadrantsLogistica', 'quadrantsCuina']
    let quadrants: Quadrant[] = []

    for (const col of quadrantCollections) {
      const snap = await db.collection(col).get()
      quadrants = quadrants.concat(
        snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Quadrant, 'id'>),
        }))
      )
    }
    console.log('[API /transports/available] 📑 Quadrants trobats total:', quadrants.length)

    // 3️⃣ Comprovació d’ocupació
    const isVehicleBusy = (vehId: string) =>
      quadrants.some((q) =>
        q.vehicles?.some((v: QuadrantVehicle) =>
          v.vehicleId === vehId &&
          overlaps(
            start,
            end,
            new Date(`${q.startDate}T${q.startTime || '00:00'}`),
            new Date(`${q.endDate}T${q.endTime || '23:59'}`)
          )
        )
      )

    // 4️⃣ Resultat final
    const result = vehicles.map(v => ({
      id: v.id,
      plate: v.plate || v.matricula || '(sense matrícula)',
      type: v.type || '(sense tipus)',
      conductorId: v.conductorId || null,
      available: !isVehicleBusy(v.id),
    }))

    console.log('[API /transports/available] ✅ Vehicles retornats:',
      result.map(r => ({ id: r.id, plate: r.plate, type: r.type, available: r.available }))
    )

    return NextResponse.json({ vehicles: result })
  } catch (error: unknown) {
    console.error('[API /transports/available] 💥 Error:', error)
    const message = error instanceof Error ? error.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
