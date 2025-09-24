// src/services/autoAssign.ts
import { firestore } from '@/lib/firebaseAdmin'
import { loadPremises } from './premises'
import { buildLedger } from './workloadLedger'
import { isEligibleByName } from './eligibility'
import { calculatePersonalNeeded } from '@/utils/calculatePersonalNeeded'
import { normalizeVehicleType } from '@/utils/normalizeVehicleType'
import { assignVehiclesAndDrivers } from './vehicleAssign'


type Personnel = {
  id: string
  name: string
  role: string
  department?: string
  isDriver?: boolean
  available?: boolean
  maxHoursWeek?: number
}

const RESPONSABLE_ROLES = new Set(['responsable', 'cap departament', 'supervisor'])
const SOLDAT_ROLES = new Set(['soldat', 'treballador', 'operari'])

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s?: string | null) => unaccent((s || '').toLowerCase().trim())

function tieBreakOrder(a: any, b: any) {
  if (a.weekAssigns !== b.weekAssigns) return a.weekAssigns - b.weekAssigns
  if (a.weekHrs !== b.weekHrs) return a.weekHrs - b.weekHrs
  if (a.monthHrs !== b.monthHrs) return a.monthHrs - b.monthHrs
  const da = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0
  const db = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0
  return da - db
}

export async function autoAssign(payload: {
  department: string
  eventId: string
  eventName: string
  location?: string
  meetingPoint?: string
  startDate: string
  startTime?: string
  endDate: string
  endTime?: string
  /** TOTAL demanat (resp + conductors + treballadors) */
  totalWorkers: number
  numDrivers: number
  manualResponsibleId?: string | null
  vehicles?: Array<{
    id?: string
    plate?: string
    vehicleType?: string
    type?: string
    conductorId?: string | null
  }>
}) {
  const {
    department, eventId, eventName, location,
    meetingPoint = '',
    startDate, startTime = '00:00',
    endDate, endTime = '00:00',
    totalWorkers, numDrivers,
    manualResponsibleId,
    vehicles = []
  } = payload

  const startISO = `${startDate}T${startTime}:00`
  const endISO = `${endDate}T${endTime}:00`
  const dept = norm(department)

  // 🔎 Log d'entrada
  console.log('[autoAssign] ▶️ inici', {
    dept, eventId, dates: { startISO, endISO },
    totalWorkers, numDrivers,
    vehiclesRequested: vehicles.map(v => ({ vehicleType: v.vehicleType ?? v.type, plate: v.plate, conductorId: v.conductorId }))
  })

  // 1) Premisses
  const { premises, warnings } = await loadPremises(dept)

  // 2) Rang setmana / mes
  const d = new Date(startISO)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  const weekStart = new Date(d); weekStart.setDate(d.getDate() - (day - 1))
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const [ws, we, ms, me] = [weekStart, weekEnd, monthStart, monthEnd].map(x => x.toISOString().slice(0, 10))

  // 3) Ledger
  const ledger = await buildLedger(dept, ws, we, ms, me)

  // 4) Personal del departament
  const ps = await firestore.collection('personnel').get()
  const all: Personnel[] = ps.docs
    .map(dref => ({ id: dref.id, ...(dref.data() as any) }))
    .filter(p => norm(p.department) === dept)

  // 5) Responsable
  let forcedByPremise = false
  let chosenResp: Personnel | null = null

  if (manualResponsibleId) {
    chosenResp = all.find(p => p.id === manualResponsibleId) || null
  }
  if (!chosenResp && premises.conditions?.length && location) {
    const hit = premises.conditions.find(c =>
      c.locations.some(loc => norm(location).includes(norm(loc)))
    )
    if (hit) {
      const candidate = all.find(p => norm(p.name) === norm(hit.responsible))
      if (candidate) {
        const elig = isEligibleByName(candidate.name, startISO, endISO, {
          busyAssignments: ledger.busyAssignments,
          restHours: premises.restHours,
          allowMultipleEventsSameDay: !!premises.allowMultipleEventsSameDay
        })
        if (!elig.eligible) forcedByPremise = true
        chosenResp = candidate
      }
    }
  }
  if (!chosenResp) {
    const pool = all.filter(p => RESPONSABLE_ROLES.has(norm(p.role)) && (p.available !== false))
    const ranked = pool.map(p => ({
      p,
      weekAssigns: ledger.assignmentsCountByUser.get(p.name) || 0,
      weekHrs: ledger.weeklyHoursByUser.get(p.name) || 0,
      monthHrs: ledger.monthlyHoursByUser.get(p.name) || 0,
      lastAssignedAt: ledger.lastAssignedAtByUser.get(p.name) || null
    })).sort(tieBreakOrder)
    chosenResp = ranked[0]?.p || null
  }

  const notes: string[] = [...(warnings || [])]
  const violations: string[] = []
  if (!chosenResp && premises.requireResponsible) {
    violations.push('responsible_missing')
  }
  if (forcedByPremise) {
    violations.push('premise_override')
    notes.push('Responsable assignat per premissa tot i no complir elegibilitat')
  }

  // 6) Pools de conductors i staff
  const baseCtx = {
    busyAssignments: ledger.busyAssignments,
    restHours: premises.restHours,
    allowMultipleEventsSameDay: !!premises.allowMultipleEventsSameDay
  }

  const exclude = new Set<string>(chosenResp ? [norm(chosenResp.name)] : [])

  const rank = (p: Personnel) => ({
    p,
    weekAssigns: ledger.assignmentsCountByUser.get(p.name) || 0,
    weekHrs: ledger.weeklyHoursByUser.get(p.name) || 0,
    monthHrs: ledger.monthlyHoursByUser.get(p.name) || 0,
    lastAssignedAt: ledger.lastAssignedAtByUser.get(p.name) || null
  })

  const driverPool = all
    .filter(p => p.isDriver && (p.available !== false) && !exclude.has(norm(p.name)))
    .filter(p => isEligibleByName(p.name, startISO, endISO, baseCtx).eligible)
    .map(rank)
    .sort(tieBreakOrder)

  const staffPool = all
    .filter(p => SOLDAT_ROLES.has(norm(p.role)) && (p.available !== false) && !exclude.has(norm(p.name)))
    .filter(p => isEligibleByName(p.name, startISO, endISO, baseCtx).eligible)
    .map(rank)
    .sort(tieBreakOrder)

// 6.1) Assignació de conductors + vehicles
const drivers = await assignVehiclesAndDrivers({
  dept,
  meetingPoint,
  startISO,
  endISO,
  baseCtx,
  driverPool,
  vehiclesRequested: vehicles,
})

  // 6.2) Càlcul de treballadors reals
  const driversForCalc = drivers.filter(d => d.name !== 'Extra').map(d => ({ name: d.name }))
  const neededWorkers = calculatePersonalNeeded({
    staffCount: Number(totalWorkers) || 0,
    drivers: driversForCalc,
    responsableName: chosenResp?.name || null
  })

  // 6.3) Selecció de treballadors
  const staff: Array<{ name: string; meetingPoint: string }> = []
  const taken = new Set<string>(exclude)

  for (const cand of staffPool) {
    if (staff.length >= neededWorkers) break
    const nm = norm(cand.p.name)
    if (taken.has(nm)) continue
    staff.push({ name: cand.p.name, meetingPoint })
    taken.add(nm)
  }
  while (staff.length < neededWorkers) {
    staff.push({ name: 'Extra', meetingPoint })
  }

  const needsReview = violations.length > 0

  // 🔎 Log de sortida resumit
  console.log('[autoAssign] ✅ resultat', {
    responsible: chosenResp?.name || null,
    drivers: drivers.map(d => ({ name: d.name, plate: d.plate, vehicleType: d.vehicleType })),
    staffCount: staff.length,
    needsReview, violations, notes
  })

  return {
    assignment: {
      responsible: chosenResp ? { name: chosenResp.name } : null,
      drivers,
      staff
    },
    meta: { needsReview, violations, notes }
  }
}
