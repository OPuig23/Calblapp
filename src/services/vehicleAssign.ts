// src/services/vehicleAssign.ts
import { firestore } from '@/lib/firebaseAdmin'
import { isEligibleByName } from './eligibility'
import { normalizeVehicleType } from '@/utils/normalizeVehicleType'

type VehicleRequest = {
  vehicleType?: string
  plate?: string
  id?: string
  conductorId?: string | null
}

type DriverPoolItem = {
  p: { id: string; name: string; department?: string; maxHoursWeek?: number }
  weekAssigns: number
  weekHrs: number
  monthHrs: number
  lastAssignedAt: string | null
}

type AssignDriverParams = {
  dept: string
  meetingPoint: string
  startISO: string
  endISO: string
  baseCtx: any
  driverPool: DriverPoolItem[]
  vehiclesRequested: VehicleRequest[]
}

export async function assignVehiclesAndDrivers({
  dept,
  meetingPoint,
  startISO,
  endISO,
  baseCtx,
  driverPool,
  vehiclesRequested,
}: AssignDriverParams) {
  const drivers: Array<{ name: string; plate: string; vehicleType: string; meetingPoint: string }> = []

  // Consulta tots els transports un cop
  const transportsSnap = await firestore.collection('transports').get()
  const allTransports = transportsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

  for (const requested of vehiclesRequested) {
    let chosenVehicle: any = null

    // --- Cas 3: vehicleId o matrícula explícita ---
    if (requested.id || requested.plate) {
      chosenVehicle = allTransports.find(
        v =>
          (requested.id && v.id === requested.id) ||
          (requested.plate && v.plate === requested.plate)
      )
    }

    // --- Cas 2: només tipus ---
    if (!chosenVehicle && requested.vehicleType) {
      const pool = allTransports.filter(
        v => normalizeVehicleType(v.type) === normalizeVehicleType(requested.vehicleType) && v.available !== false
      )
      chosenVehicle = pool.shift() || null
    }

    // --- Cas 1: ni tipus ni matrícula ---
    if (!chosenVehicle && !requested.vehicleType) {
      // No hi ha vehicle → només conductor
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
      const fixed = driverPool.find(d => d.p.id === chosenVehicle.conductorId)
      if (fixed) {
        const elig = isEligibleByName(fixed.p.name, startISO, endISO, baseCtx)
        if (elig.eligible) {
          assigned = fixed.p.name
        }
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
      vehicleType: normalizeVehicleType(chosenVehicle?.type || requested.vehicleType || ''),
    })
  }

  return drivers
}
