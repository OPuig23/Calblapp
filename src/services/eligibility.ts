// src/services/eligibility.ts
export interface AssignmentPerson {
  name: string
}

export interface BusyAssignment {
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  responsable?: AssignmentPerson
  conductors?: AssignmentPerson[]
  treballadors?: AssignmentPerson[]
}

export type EligibilityCtx = {
  busyAssignments: BusyAssignment[]
  restHours: number
  allowMultipleEventsSameDay: boolean
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s: string) => unaccent(s).toLowerCase().trim()

const toISO = (d: string, t?: string) => `${d}T${(t || '00:00')}:00`
const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 36e5

export function isEligibleByName(
  personName: string,
  startISO: string,
  endISO: string,
  ctx: EligibilityCtx
) {
  const start = new Date(startISO)
  const end   = new Date(endISO)
  const personKey = norm(personName)

  for (const q of ctx.busyAssignments) {
    const their = new Set<string>([
      ...(q.treballadors || []).map((x: AssignmentPerson) => x.name),
      ...(q.conductors || []).map((x: AssignmentPerson) => x.name),
      q.responsable?.name,
    ].filter(Boolean).map((name) => norm(String(name))) as string[])

    if (!their.has(personKey)) continue

    const s2 = new Date(toISO(q.startDate, q.startTime))
    const e2 = new Date(toISO(q.endDate, q.endTime))

    // Solapament
    const overlap = start < e2 && end > s2
    if (overlap) return { eligible: false, reason: 'overlap' as const }

    // Descans mínim
    const restGap = Math.max(hoursBetween(e2, start), hoursBetween(end, s2))
    if (restGap < ctx.restHours) return { eligible: false, reason: 'rest_violation' as const }

    // Mateix dia
    if (!ctx.allowMultipleEventsSameDay) {
      const d1 = startISO.slice(0, 10)
      const d2 = toISO(q.startDate, q.startTime).slice(0, 10)
      if (d1 === d2) return { eligible: false, reason: 'same_day_not_allowed' as const }
    }
  }

  return { eligible: true as const }
}
