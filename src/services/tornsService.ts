// filename: src/services/tornsService.ts

export type Torn = {
  id: string
  code?: string
  eventId: string
  eventName: string
  date: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  meetingPoint?: string
  location?: string
  department: string
  __rawWorkers?: Array<{
    id?: string
    name?: string
    role?: string
    startTime?: string
    endTime?: string
    meetingPoint?: string
    department?: string
  }>
  // Camps que omplim quan filtrem per treballador
  workerName?: string
  workerRole?: string
}

// Tipus genèric per documents de Firestore
export type FirestoreData = Record<string, unknown>

// Per tipar els treballadors que arriben dins dels documents
export interface RawWorker {
  id?: string
  workerId?: string
  uid?: string
  email?: string
  name?: string
  nom?: string
  displayName?: string
  startTime?: string
  endTime?: string
  meetingPoint?: string
}

// ────────────────────────────────────────────────
// Helpers bàsics

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseAnyDateToISO(
  v: string | Date | { toDate: () => Date } | null | undefined
): string {
  if (!v) return ''
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return toISODate((v as { toDate: () => Date }).toDate())
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : toISODate(d)
}

function norm(s?: string | null): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function pad2(n: number | string): string {
  return String(n).padStart(2, '0')
}

function toTimeHHmm(
  v: string | number | Date | { toDate: () => Date } | null | undefined
): string {
  if (!v) return ''
  const str = String(v)
  if (/^\d{2}:\d{2}$/.test(str)) return str
  if (/^\d{4}$/.test(str)) return `${str.slice(0, 2)}:${str.slice(2)}`
  if (typeof v === 'number') {
    return `${pad2(Math.floor(v / 60))}:${pad2(Number(v) % 60)}`
  }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    const d = (v as { toDate: () => Date }).toDate()
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }
  const d = new Date(str)
  return isNaN(d.getTime())
    ? str
    : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function isISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function rangesOverlap(
  aStartISO: string,
  aEndISO: string,
  bStartISO: string,
  bEndISO: string
): boolean {
  if (!isISODate(aStartISO) || !isISODate(aEndISO) || !isISODate(bStartISO) || !isISODate(bEndISO))
    return false
  let aStart = new Date(`${aStartISO}T00:00:00`)
  let aEnd = new Date(`${aEndISO}T23:59:59`)
  let bStart = new Date(`${bStartISO}T00:00:00`)
  let bEnd = new Date(`${bEndISO}T23:59:59`)
  if (aStart > aEnd) [aStart, aEnd] = [aEnd, aStart]
  if (bStart > bEnd) [bStart, bEnd] = [bEnd, bStart]
  return aStart <= bEnd && bStart <= aEnd
}

function coerceWorker(
  val: string | RawWorker | null | undefined,
  role?: 'treballador' | 'conductor' | 'responsable'
) {
  if (!val) return role ? { role } : {}
  if (typeof val === 'object') {
    const id = val.id ?? val.workerId ?? val.uid ?? val.email ?? undefined
    const name = val.name ?? val.nom ?? val.displayName ?? undefined
    return {
      id: id ? String(id) : undefined,
      name: name ? String(name) : undefined,
      ...(role ? { role } : {}),
    }
  }
  return { name: String(val), ...(role ? { role } : {}) }
}

// ────────────────────────────────────────────────
// Mapping Firestore → Torn

type TornDoc = {
  eventId?: string
  code?: string
  eventName?: string
  summary?: string
  date?: string
  startDate?: string | { toDate: () => Date }
  endDate?: string | { toDate: () => Date }
  startTime?: string | number | Date | { toDate: () => Date }
  endTime?: string | number | Date | { toDate: () => Date }
  meetingPoint?: string
  department?: string
  location?: string
  treballadors?: RawWorker[]
  conductors?: RawWorker[]
  responsable?: RawWorker
  responsableId?: string
  responsableName?: string
}

function mapDocToTorn(
  id: string,
  d: FirestoreData,
  fallbackDept: string | null
): Torn {
  // Fem un cast controlat a un tipus amb els camps que esperem
  const doc = d as TornDoc

  const eventId = String(doc?.eventId ?? doc?.code ?? '')
  const eventName = String(doc?.eventName ?? doc?.summary ?? '')
  const startDate = parseAnyDateToISO(doc?.startDate ?? doc?.date)
  const endDate = doc?.endDate ? parseAnyDateToISO(doc.endDate) : ''
  const startTime = toTimeHHmm(doc?.startTime)
  const endTime = toTimeHHmm(doc?.endTime)
  const meetingPoint = doc?.meetingPoint ?? ''
  const department = doc?.department
    ? norm(doc.department)
    : fallbackDept
    ? norm(fallbackDept)
    : 'sense departament'

  const location = doc?.location ? String(doc.location) : undefined

  const arrTreballadors = Array.isArray(doc?.treballadors) ? doc.treballadors : []
  const arrConductors = Array.isArray(doc?.conductors) ? doc.conductors : []
  const responsableObj =
    doc?.responsable ??
    ((doc?.responsableName || doc?.responsableId)
      ? { id: doc.responsableId as string, name: doc.responsableName as string }
      : undefined)

  const unified: Torn['__rawWorkers'] = []

  for (const w of arrTreballadors) {
    const worker = w // RawWorker
    unified.push({
      ...coerceWorker(worker, 'treballador'),
      startTime: toTimeHHmm(worker.startTime ?? doc?.startTime),
      endTime: toTimeHHmm(worker.endTime ?? doc?.endTime),
      meetingPoint: worker.meetingPoint ?? meetingPoint,
      department,
    })
  }

  for (const w of arrConductors) {
    const worker = w // RawWorker
    unified.push({
      ...coerceWorker(worker, 'conductor'),
      startTime: toTimeHHmm(worker.startTime ?? doc?.startTime),
      endTime: toTimeHHmm(worker.endTime ?? doc?.endTime),
      meetingPoint: worker.meetingPoint ?? meetingPoint,
      department,
    })
  }

  if (responsableObj) {
    const coerced = coerceWorker(responsableObj, 'responsable')
    unified.push({
      ...coerced,
      startTime: toTimeHHmm(responsableObj.startTime ?? doc?.startTime),
      endTime: toTimeHHmm(responsableObj.endTime ?? doc?.endTime),
      meetingPoint: responsableObj.meetingPoint ?? meetingPoint,
      department,
    })
  }

  return {
    id: String(id || ''),
    code: doc?.code ? String(doc.code) : undefined,
    eventId,
    eventName,
    date: startDate || endDate || '',
    startDate,
    endDate: endDate || startDate,
    startTime,
    endTime,
    meetingPoint,
    location,
    department,
    __rawWorkers: unified,
  }
}

// ────────────────────────────────────────────────
// Helpers de confirmació i departaments

const KNOWN_DEPARTMENTS = ['logistica', 'serveis', 'cuina']

function isConfirmed(data: FirestoreData): boolean {
  const st = String((data as Record<string, unknown>)?.status ?? (data as Record<string, unknown>)?.estat ?? '')
    .toLowerCase()
    .trim()
  const hasMark =
    !!(data as Record<string, unknown>)?.['confirmedAt'] ||
    !!(data as Record<string, unknown>)?.['confirmada'] ||
    !!(data as Record<string, unknown>)?.['confirmed']
  return (
    st === 'confirmed' ||
    st === 'confirmada' ||
    st === 'confirmat' ||
    st === 'ok' ||
    hasMark
  )
}

// ────────────────────────────────────────────────
// Fetchs

async function fetchDeptCollectionRange(
  db: FirebaseFirestore.Firestore,
  dep: string,
  startISO: string,
  endISO: string,
  out: Torn[]
) {
  const cap = dep.charAt(0).toUpperCase() + dep.slice(1)
  const collName = `quadrants${cap}`

  let snap: FirebaseFirestore.QuerySnapshot
  try {
    snap = await db
      .collection(collName)
      .where('status', '==', 'confirmed')
      .where('startDate', '>=', startISO)
      .where('startDate', '<=', endISO)
      .get()
  } catch {
    snap = await db.collection(collName).get()
  }

  snap.forEach((doc) => {
    const data = doc.data() as FirestoreData
    if (!isConfirmed(data)) return

    const t = mapDocToTorn(doc.id, data, dep)
    if (!t.startDate && !t.endDate) return

    if (rangesOverlap(t.startDate || t.endDate, t.endDate || t.startDate, startISO, endISO)) {
      const cur = new Date(t.startDate) // const (no reassignem la referència)
      const realEnd = new Date(t.endDate)
      while (cur <= realEnd) {
        const iso = toISODate(cur)
        out.push({ ...t, date: iso })
        cur.setDate(cur.getDate() + 1)
      }
    }
  })
}

export async function fetchAllTorns(
  startISO: string,
  endISO: string,
  role: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador',
  department?: string | null,
  workerName?: string
): Promise<Torn[]> {
  const dep = department ? norm(department) : null
  console.log('[fetchAllTorns] range', { startISO, endISO, role, department })

  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const admin = await import('firebase-admin')
    if (admin.apps.length === 0) admin.initializeApp({})
    const db = getFirestore()

    const out: Torn[] = []

    // ── 1. Treballador
    if (role === 'Treballador') {
      if (dep) {
        await fetchDeptCollectionRange(db, dep, startISO, endISO, out)
        return out.filter((t) => {
          if (!Array.isArray(t.__rawWorkers)) return false
          const matchWorker = t.__rawWorkers.find(
            (w) => norm(w.name) === norm(workerName)
          )
          if (matchWorker) {
            t.workerName = matchWorker.name
            t.workerRole = matchWorker.role
            return true
          }
          return false
        })
      }
      return []
    }

    // ── 2. Cap Departament
    if (role === 'Cap Departament') {
      if (dep) {
        await fetchDeptCollectionRange(db, dep, startISO, endISO, out)
        return out
      }
      return []
    }

    // ── 3. Admin / Direcció
    if (role === 'Admin' || role === 'Direcció') {
      if (dep) {
        await fetchDeptCollectionRange(db, dep, startISO, endISO, out)
      } else {
        for (const d of KNOWN_DEPARTMENTS) {
          await fetchDeptCollectionRange(db, d, startISO, endISO, out)
        }
      }

      const collRef = db.collection('quadrants')
      const snap2 = await collRef
        .where('status', '==', 'confirmed')
        .where('startDate', '>=', startISO)
        .where('startDate', '<=', endISO)
        .get()

      snap2.forEach((doc) => {
        const data = doc.data() as FirestoreData
        if (!isConfirmed(data)) return
        const t = mapDocToTorn(doc.id, data, dep)
        if (!t.startDate && !t.endDate) return

        if (rangesOverlap(t.startDate || t.endDate, t.endDate || t.startDate, startISO, endISO)) {
          const cur = new Date(t.startDate) // const
          const realEnd = new Date(t.endDate)
          while (cur <= realEnd) {
            const iso = toISODate(cur)
            out.push({ ...t, date: iso })
            cur.setDate(cur.getDate() + 1)
          }
        }
      })

      return out
    }

    return []
  } catch (e) {
    console.error('[tornsService] Firestore error:', e)
    return []
  }
}
