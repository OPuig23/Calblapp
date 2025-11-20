// src/pages/api/transports/available.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

// Helpers
const toDateTime = (date: string, time: string) => 
  new Date(`${date}T${time}:00`)

const overlaps = (startA: Date, endA: Date, startB: Date, endB: Date): boolean =>
  startA < endB && startB < endA

interface Vehicle {
  id: string
  plate?: string
  type?: string
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API /transports/available] 🔔 Method:', req.method)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { startDate, startTime, endDate, endTime } = req.body || {}
    console.log('[API /transports/available] 📩 Body rebut:', req.body)

    // Validació camps obligatoris
    if (!startDate || !startTime || !endDate || !endTime) {
      console.warn('[API /transports/available] ⚠️ Falten camps obligatoris')
      return res.status(400).json({ error: 'Missing fields' })
    }

    const start = toDateTime(startDate, startTime)
    const end   = toDateTime(endDate, endTime)

    // 1) Vehicles de Firestore
    const vehSnap = await db.collection('transports').get()
    const vehicles: Vehicle[] = vehSnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Vehicle, 'id'>),
    }))
    console.log('[API /transports/available] 🚚 Vehicles trobats:', vehicles.length)

    // 2) Quadrants de TOTS els departaments
    const quadSnap = await db.collectionGroup('quadrants').get()
    const quadrants: Quadrant[] = quadSnap.docs.map(d => ({
      id: d.id,
      ...(d.data() as Omit<Quadrant, 'id'>),
    }))
    console.log('[API /transports/available] 📑 Quadrants trobats:', quadrants.length)

    // 3) Helper: comprovar si vehicle està ocupat dins del rang seleccionat
    const isVehicleBusy = (vehId: string) =>
      quadrants.some((q) =>
        q.vehicles?.some((v: QuadrantVehicle) =>
          v.vehicleId === vehId &&
          overlaps(
            start,
            end,
            new Date(`${q.startDate}T${q.startTime}`),
            new Date(`${q.endDate}T${q.endTime}`)
          )
        )
      )

    // 4) Resultat final
    const result = vehicles.map(v => ({
      id: v.id,
      plate: v.plate || '(sense matrícula)',
      type: v.type || '(sense tipus)',
      available: !isVehicleBusy(v.id),
    }))

    console.log('[API /transports/available] ✅ Retorn:', JSON.stringify(result, null, 2))
    return res.status(200).json({ vehicles: result })

  } catch (error: unknown) {
    console.error('[API /transports/available] 💥 Error general:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
}
