// filename: src/utils/personnelRest.ts
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/firebaseAdmin'


/* ================= Helpers ================= */
export const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const norm = (s?: string | null) =>
  unaccent((s || '').toLowerCase().trim())

export const capitalize = (s: string) =>
  s ? s[0].toUpperCase() + s.slice(1) : s

export const toISO = (d?: string, t?: string) =>
  `${d || ''}T${t || '00:00'}:00` // sense Z (local)

/* ================= Tipus ================= */
export interface WorkerRef {
  id?: string
  name?: string
}

export interface QuadrantDoc {
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  responsable?: WorkerRef
  responsableName?: string
  conductors?: WorkerRef[]
  treballadors?: WorkerRef[]
}

/* =============== Premisses (JSON) =============== */
export async function loadMinRestHours(department: string): Promise<number> {
  const filePath = path.resolve(
    process.cwd(),
    `src/data/premises-${norm(department)}.json`
  )
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8')
    const data = JSON.parse(raw) as { restHours?: number }
    const v = Number(data?.restHours)
    return Number.isFinite(v) && v > 0 ? v : 8
  } catch {
    return 8
  }
}

/* =============== Utils temps/solapament =============== */
export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart
}

/* =============== Descans mínim per NOM =============== */
export function hasMinRestByName(
  personName: string,
  quadrants: QuadrantDoc[],
  newStart: Date,
  newEnd: Date,
  minRestH: number
): boolean {
  const msRest = (minRestH || 8) * 3600000
  const person = norm(personName)

  for (const q of quadrants) {
    const involvedNames: string[] = [
      ...(Array.isArray(q.treballadors)
        ? q.treballadors.map(t => t?.name).filter(Boolean) as string[]
        : []),
      ...(Array.isArray(q.conductors)
        ? q.conductors.map(c => c?.name).filter(Boolean) as string[]
        : []),
      ...(q.responsable?.name ? [q.responsable.name] : []),
      ...(q.responsableName ? [q.responsableName] : []),
    ].map(norm)

    if (!involvedNames.includes(person)) continue

    const prevStart = new Date(toISO(q.startDate, q.startTime))
    const prevEnd = new Date(toISO(q.endDate, q.endTime))

    if (intervalsOverlap(prevStart, prevEnd, newStart, newEnd)) {
      console.log(`[hasMinRestByName] OVERLAP → ${personName}`)
      return false
    }

    const gapBefore = newStart.getTime() - prevEnd.getTime()
    const gapAfter = prevStart.getTime() - newEnd.getTime()

    if (gapBefore < msRest && gapAfter < msRest) {
      console.log(`[hasMinRestByName] REST FAIL → ${personName}`)
      return false
    }
  }
  return true
}

/* =============== IDs/NOMS ocupats =============== */
export async function getBusyPersonnelIds(
  department: string,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string
): Promise<string[]> {
  const ids: string[] = []
  const push = (label: string, v?: string) => {
    const n = norm(v)
    if (n) {
      ids.push(n)
      console.log(`[getBusyPersonnelIds] PUSH ${label}:`, v, '→', n)
    }
  }

  const newStart = new Date(`${startDate}T${startTime || '00:00'}:00Z`)
  const newEnd = new Date(`${endDate}T${endTime || '23:59'}:00Z`)

  const colId = `quadrants${capitalize(norm(department))}`
  const snap = await firestore
    .collection(colId)
    .where('startDate', '<=', endDate)
    .get()

  console.log(`[getBusyPersonnelIds] scanning col: ${colId} → ${snap.size} docs`)

  snap.docs.forEach(d => {
    const q = d.data() as QuadrantDoc
    const qStart = new Date(`${q.startDate}T${q.startTime || '00:00'}:00Z`)
    const qEnd = new Date(`${q.endDate}T${q.endTime || '23:59'}:00Z`)

    if (!intervalsOverlap(qStart, qEnd, newStart, newEnd)) return

    push('responsable', q.responsable?.id || q.responsable?.name)
    if (Array.isArray(q.conductors)) {
      q.conductors.forEach(c => push('conductor', c?.id || c?.name))
    }
    if (Array.isArray(q.treballadors)) {
      q.treballadors.forEach(t => push('treballador', t?.id || t?.name))
    }
  })

  console.log('[getBusyPersonnelIds] returning', ids.length, 'idsOrNames →', ids)

  return Array.from(new Set(ids))
}
