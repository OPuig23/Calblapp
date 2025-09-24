// src/services/eligibility.ts
export type EligibilityCtx = {
  busyAssignments: any[]
  restHours: number
  allowMultipleEventsSameDay: boolean
}

const toISO = (d: string, t?: string) => `${d}T${(t || '00:00')}:00`
const hoursBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 36e5

export function isEligibleByName(personName: string, startISO: string, endISO: string, ctx: EligibilityCtx) {
  const start = new Date(startISO)
  const end   = new Date(endISO)

  for (const q of ctx.busyAssignments) {
    const their = new Set<string>([
      ...(q.treballadors || []).map((x: any) => x?.name),
      ...(q.conductors || []).map((x: any) => x?.name),
      q.responsable?.name,
    ].filter(Boolean))

    if (!their.has(personName)) continue

    const s2 = new Date(toISO(q.startDate, q.startTime))
    const e2 = new Date(toISO(q.endDate, q.endTime))

    // Solapament
    const overlap = start < e2 && end > s2
    if (overlap) return { eligible: false, reason: 'overlap' }

    // Descans mínim: distància entre e2 → start (o end → s2)
    const restGap = Math.max(hoursBetween(e2, start), hoursBetween(end, s2))
    if (restGap < ctx.restHours) return { eligible: false, reason: 'rest_violation' }

    // Mateix dia
    if (!ctx.allowMultipleEventsSameDay) {
      const d1 = startISO.slice(0, 10)
      const d2 = toISO(q.startDate, q.startTime).slice(0, 10)
      if (d1 === d2) return { eligible: false, reason: 'same_day_not_allowed' }
    }
  }
  return { eligible: true }
}
