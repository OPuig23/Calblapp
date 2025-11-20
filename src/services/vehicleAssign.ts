// ✅ filename: src/services/vehicleAssign.ts
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { isEligibleByName } from './eligibility'
import { normalizeVehicleType } from '@/utils/normalizeVehicleType'

export type VehicleRequest = {
  vehicleType?: string
  plate?: string
  id?: string
  conductorId?: string | null
}

export type DriverPoolItem = {
  p: { id: string; name: string; department?: string; maxHoursWeek?: number }
  weekAssigns: number
  weekHrs: number
  monthHrs: number
  lastAssignedAt: string | null
}

export type BaseCtx = {
  busyAssignments: any[]   // 👈 ara s’ajusta al tipus real que ve del ledger
  restHours: number
  allowMultipleEventsSameDay: boolean
}

export interface Transport {
  id: string
  plate?: string
  type?: string
  available?: boolean
  conductorId?: string | null
}

export interface DriverAssignment {
  name: string
  plate: string
  vehicleType: string
  meetingPoint: string
}

export type AssignDriverParams = {
  meetingPoint: string
  startISO: string
  endISO: string
  baseCtx: BaseCtx
  driverPool: DriverPoolItem[]
  vehiclesRequested: VehicleRequest[]
}

export async function assignVehiclesAndDrivers({
  meetingPoint,
  startISO,
  endISO,
  baseCtx,
  driverPool,
  vehiclesRequested,
}: AssignDriverParams): Promise<DriverAssignment[]> {
  const drivers: DriverAssignment[] = []

  // ✅ Consulta correcta dels transports a Firestore (admin)
  const transportsSnap = await db.collection('transports').get()
  const allTransports: Transport[] = transportsSnap.docs.map(d => {
    const data = d.data() as Partial<Transport>
    return {
      id: d.id,
      plate: data.plate,
      type: data.type,
      available: data.available,
      conductorId: data.conductorId,
    }
  })

  for (const requested of vehiclesRequested) {
    let chosenVehicle: Transport | null = null

    // --- Cas 3: vehicleId o matrícula explícita ---
    if (requested.id || requested.plate) {
      chosenVehicle =
        allTransports.find(
          v =>
            (requested.id && v.id === requested.id) ||
            (requested.plate && v.plate === requested.plate)
        ) || null
    }

    // --- Cas 2: només tipus ---
    if (!chosenVehicle && requested.vehicleType) {
      const pool = allTransports.filter(
        v =>
          normalizeVehicleType(v.type || '') ===
            normalizeVehicleType(requested.vehicleType || '') &&
          v.available !== false
      )
      chosenVehicle = pool.shift() || null
    }

    // --- Cas 1: ni tipus ni matrícula ---
    if (!chosenVehicle && !requested.vehicleType) {
      const pick = driverPool.shift()
      drivers.push({
        name: pick ? pick.p.name : 'Extra',
        meetingPoint,
        plate: '',
        vehicleType: '',
      })
      continue
    }

    // --- Assignació de conductor ---
    let assigned: string | null = null

    if (chosenVehicle?.conductorId) {
      const fixed = driverPool.find(d => d.p.id === chosenVehicle!.conductorId)
      if (fixed) {
        const elig = isEligibleByName(fixed.p.name, startISO, endISO, baseCtx)
        if (elig.eligible) assigned = fixed.p.name
      }
    }

    if (!assigned) {
      const pick = driverPool.shift()
      assigned = pick ? pick.p.name : 'Extra'
    }

    drivers.push({
      name: assigned || 'Extra',
      meetingPoint,
      plate: chosenVehicle?.plate || '',
      vehicleType: normalizeVehicleType(
        chosenVehicle?.type || requested.vehicleType || ''
      ),
    })
  }

  return drivers
}
