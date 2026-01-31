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
  responsableName?: string | null
  responsables?: AssignmentPerson[]
  conductors?: AssignmentPerson[]
  treballadors?: AssignmentPerson[]
  groups?: Array<{
    responsibleName?: string | null
    responsibleId?: string | null
  }>
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
const normalizeRange = (start: Date, end: Date) =>
  end <= start ? { start, end: new Date(end.getTime() + 24 * 60 * 60 * 1000) } : { start, end }

export function isEligibleByName(
  personName: string,
  startISO: string,
  endISO: string,
  ctx: EligibilityCtx
) {
  const start = new Date(startISO)
  const end   = new Date(endISO)
  const req = normalizeRange(start, end)
  const personKey = norm(personName)

  for (const q of ctx.busyAssignments) {
    const their = new Set<string>([
      ...(q.treballadors || []).map((x: AssignmentPerson) => x.name),
      ...(q.conductors || []).map((x: AssignmentPerson) => x.name),
      ...(q.responsables || []).map((x: AssignmentPerson) => x.name),
      q.responsable?.name,
      q.responsableName || undefined,
      ...(q.groups || []).map((g) => g?.responsibleName || undefined),
    ]
      .filter(Boolean)
      .map((name) => norm(String(name))) as string[])

    if (!their.has(personKey)) continue

    const s2 = new Date(toISO(q.startDate, q.startTime))
    const e2 = new Date(toISO(q.endDate, q.endTime))
    const busy = normalizeRange(s2, e2)

    // Solapament
    const overlap = req.start < busy.end && req.end > busy.start
    if (overlap) return { eligible: false, reason: 'overlap' as const }

    // Descans mínim
    const restGap = Math.max(
      hoursBetween(busy.end, req.start),
      hoursBetween(req.end, busy.start)
    )
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
