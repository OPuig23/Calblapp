// src/services/workloadLedger.ts
import { firestore } from '@/lib/firebaseAdmin'

export type Ledger = {
  weeklyHoursByUser: Map<string, number>
  monthlyHoursByUser: Map<string, number>
  assignmentsCountByUser: Map<string, number>
  lastAssignedAtByUser: Map<string, string | null>
  busyAssignments: any[]
}

const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (s?: string) => unaccent((s || '').toLowerCase().trim())
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const collForDept = (d: string) => `quadrants${capitalize(norm(d))}`

const toHrs = (s?: string, t?: string, eS?: string, eT?: string) => {
  const start = s ? new Date(`${s}T${(t || '00:00')}:00`) : null
  const end   = eS ? new Date(`${eS}T${(eT || '00:00')}:00`) : null
  if (!start || !end) return 0
  const ms = end.getTime() - start.getTime()
  return ms > 0 ? ms / 36e5 : 0
}

export async function buildLedger(
  department: string,
  weekStartISO: string,
  weekEndISO: string,
  monthStartISO: string,
  monthEndISO: string
): Promise<Ledger> {
  const weeklyHoursByUser = new Map<string, number>()
  const monthlyHoursByUser = new Map<string, number>()
  const assignmentsCountByUser = new Map<string, number>()
  const lastAssignedAtByUser = new Map<string, string | null>()

  const snap = await firestore.collection(collForDept(department)).get()
  const busy: any[] = []
  snap.forEach(d => busy.push({ id: d.id, ...d.data() }))

  const add = (m: Map<string, number>, key: string, v: number) => m.set(key, (m.get(key) || 0) + v)
  const addCount = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) || 0) + 1)
  const setLast = (m: Map<string, string | null>, key: string, dt: string) => {
    const prev = m.get(key)
    if (!prev || new Date(prev) < new Date(dt)) m.set(key, dt)
  }

  for (const q of busy) {
    if (!['draft', 'confirmed'].includes(String(q.status || 'draft'))) continue
    if (norm(q.department) !== norm(department)) continue

    const startISO = `${q.startDate}T${(q.startTime || '00:00')}:00`
    const endISO   = `${q.endDate}T${(q.endTime || '00:00')}:00`
    const hrs = toHrs(q.startDate, q.startTime, q.endDate, q.endTime)

    const persons: string[] = [
      ...(Array.isArray(q.treballadors) ? q.treballadors.map((x: any) => x?.name).filter(Boolean) : []),
      ...(Array.isArray(q.conductors) ? q.conductors.map((x: any) => x?.name).filter(Boolean) : []),
      ...(q.responsable?.name ? [q.responsable.name] : []),
    ]

    for (const name of persons) {
      // setmanal
      if (startISO >= `${weekStartISO}T00:00:00` && startISO < `${weekEndISO}T23:59:59`) {
        add(weeklyHoursByUser, name, hrs)
        addCount(assignmentsCountByUser, name)
      }
      // mensual
      if (startISO >= `${monthStartISO}T00:00:00` && startISO < `${monthEndISO}T23:59:59`) {
        add(monthlyHoursByUser, name, hrs)
      }
      setLast(lastAssignedAtByUser, name, startISO)
    }
  }

  return { weeklyHoursByUser, monthlyHoursByUser, assignmentsCountByUser, lastAssignedAtByUser, busyAssignments: busy }
}
