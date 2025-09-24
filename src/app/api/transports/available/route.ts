// src/app/api/transports/available/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`)

const overlaps = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA < endB && startB < endA

export async function POST(req: Request) {
  try {
    const { startDate, startTime, endDate, endTime } = await req.json()

    console.log('[API /transports/available] 📩 Body rebut:', {
      startDate, startTime, endDate, endTime,
    })

    if (!startDate || !startTime || !endDate || !endTime) {
      console.warn('[API /transports/available] ⚠️ Falten camps obligatoris')
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const start = toDateTime(startDate, startTime)
    const end   = toDateTime(endDate, endTime)

    // 1) Vehicles de Firestore
    const vehSnap = await db.collection('transports').get()
    const vehicles = vehSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    console.log('[API /transports/available] 🚚 Vehicles trobats a Firestore:', vehicles)

    // 2) Quadrants de tots els departaments
    const quadSnap = await db.collectionGroup('quadrants').get()
    const quadrants = quadSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    console.log('[API /transports/available] 📑 Quadrants trobats:', quadrants.length)

    // 3) Helper per comprovar si un vehicle està ocupat
    const isVehicleBusy = (vehId: string) =>
      quadrants.some(q =>
        q.vehicles?.some((v: any) =>
          v.vehicleId === vehId &&
          overlaps(
            start, end,
            new Date(`${q.startDate}T${q.startTime}`),
            new Date(`${q.endDate}T${q.endTime}`)
          )
        )
      )

    // 4) Resultat final
    const result = vehicles.map(v => ({
      id: v.id,
      plate: v.plate || v.matricula || '(sense matrícula)',
      type: v.type || '(sense tipus)',
      conductorId: v.conductorId || null,
      available: !isVehicleBusy(v.id),
    }))

    console.log('[API /transports/available] ✅ Vehicles retornats:',
      result.map(r => ({
        id: r.id,
        plate: r.plate,
        type: r.type,
        available: r.available,
      }))
    )

    return NextResponse.json({ vehicles: result })
  } catch (err: any) {
    console.error('[API /transports/available] 💥 Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
