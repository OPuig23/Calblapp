//filename: src/services/tornsService.ts
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
  }>
}

// Helpers

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseAnyDateToISO(v: any): string {
  if (!v) return ''
  if (typeof v === 'object' && typeof v.toDate === 'function') return toISODate(v.toDate())
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : toISODate(d)
}

function norm(s: any): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function pad2(n: number | string): string { return String(n).padStart(2, '0') }

function toTimeHHmm(v: any): string {
  if (!v) return ''
  const str = String(v)
  if (/^\d{2}:\d{2}$/.test(str)) return str
  if (/^\d{4}$/.test(str)) return `${str.slice(0,2)}:${str.slice(2)}`
  if (typeof v === 'number') return `${pad2(Math.floor(v/60))}:${pad2(Number(v)%60)}`
  if (typeof v === 'object' && typeof v.toDate === 'function') {
    const d = v.toDate() as Date
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? str : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function isISODate(s: any): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function rangesOverlap(aStartISO: string, aEndISO: string, bStartISO: string, bEndISO: string): boolean {
  if (!isISODate(aStartISO) || !isISODate(aEndISO) || !isISODate(bStartISO) || !isISODate(bEndISO)) return false
  let aStart = new Date(`${aStartISO}T00:00:00`)
  let aEnd   = new Date(`${aEndISO}T23:59:59`)
  let bStart = new Date(`${bStartISO}T00:00:00`)
  let bEnd   = new Date(`${bEndISO}T23:59:59`)
  if (aStart > aEnd) [aStart, aEnd] = [aEnd, aStart]
  if (bStart > bEnd) [bStart, bEnd] = [bEnd, bStart]
  return aStart <= bEnd && bStart <= aEnd
}

function coerceWorker(val: any, role?: 'treballador' | 'conductor' | 'responsable') {
  if (!val) return role ? { role } : {}
  if (typeof val === 'object') {
    const id = val.id ?? val.workerId ?? val.uid ?? val.email ?? undefined
    const name = val.name ?? val.nom ?? val.displayName ?? undefined
    return { id: id ? String(id) : undefined, name: name ? String(name) : undefined, ...(role ? { role } : {}) }
  }
  return { name: String(val), ...(role ? { role } : {}) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping Firestore → Torn

function mapDocToTorn(id: string, d: any, fallbackDept: string | null): Torn {
  const eventId     = String(d?.eventId ?? d?.code ?? '')
  const eventName   = String(d?.eventName ?? d?.summary ?? '')
  const startDate   = parseAnyDateToISO(d?.startDate ?? d?.date)
  const endDate     = d?.endDate ? parseAnyDateToISO(d?.endDate) : ''
  const startTime   = toTimeHHmm(d?.startTime)
  const endTime     = toTimeHHmm(d?.endTime)
  const meetingPoint= d?.meetingPoint ?? ''
  const department = d?.department 
  ? norm(d.department) 
  : fallbackDept 
    ? norm(fallbackDept) 
    : 'sense departament'

  const location    = d?.location ? String(d.location) : undefined

  const arrTreballadors = Array.isArray(d?.treballadors) ? d.treballadors : []
  const arrConductors   = Array.isArray(d?.conductors)   ? d.conductors   : []
  const responsableObj  = d?.responsable ?? ((d?.responsableName || d?.responsableId) ? { id: d.responsableId, name: d.responsableName } : null)

  const unified: Torn["__rawWorkers"] = []

  for (const w of arrTreballadors) {
    unified.push({
      ...coerceWorker(w, 'treballador'),
      startTime: toTimeHHmm(w?.startTime ?? d?.startTime),
      endTime: toTimeHHmm(w?.endTime ?? d?.endTime),
      meetingPoint: w?.meetingPoint ?? meetingPoint,
      department,
    })
  }
  for (const w of arrConductors) {
    unified.push({
      ...coerceWorker(w, 'conductor'),
      startTime: toTimeHHmm(w?.startTime ?? d?.startTime),
      endTime: toTimeHHmm(w?.endTime ?? d?.endTime),
      meetingPoint: w?.meetingPoint ?? meetingPoint,
      department,
    })

  }
  if (responsableObj) {
  const coerced = coerceWorker(responsableObj, 'responsable')

  console.log('[mapDocToTorn responsable]', {
    eventName,
    responsableObj,
    coerced,
  })

  unified.push({
    ...coerced,
    startTime: toTimeHHmm(responsableObj?.startTime ?? d?.startTime),
    endTime: toTimeHHmm(responsableObj?.endTime ?? d?.endTime),
    meetingPoint: responsableObj?.meetingPoint ?? meetingPoint,
    department,
  })
}


  return {
    id: String(id || ''),
    code: d?.code ? String(d.code) : undefined,
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

// ─────────────────────────────────────────────────────────────────────────────
// Fetch principal amb lògica de rol

const KNOWN_DEPARTMENTS = ['logistica','serveis','cuina']

function isConfirmed(data: any): boolean {
  const st = String(data?.status ?? data?.estat ?? '').toLowerCase().trim()
  const hasMark = !!data?.confirmedAt || !!data?.confirmada || !!data?.confirmed
  return st === 'confirmed' || st === 'confirmada' || st === 'confirmat' || st === 'ok' || hasMark
}

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
    snap = await db.collection(collName)
      .where('status', '==', 'confirmed')
      .where('startDate', '>=', startISO)
      .where('startDate', '<=', endISO)
      .get()
  } catch {
    snap = await db.collection(collName).get()
  }

  snap.forEach(doc => {
    const data = doc.data()
    if (!isConfirmed(data)) return

    const t = mapDocToTorn(doc.id, data, dep)
    if (!t.startDate && !t.endDate) return

    if (rangesOverlap(t.startDate || t.endDate, t.endDate || t.startDate, startISO, endISO)) {
      let cur = new Date(t.startDate)
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

    // ── 1. Treballador → només els seus torns confirmats del seu departament
if (role === 'Treballador') {
  if (dep) {
    await fetchDeptCollectionRange(db, dep, startISO, endISO, out)

    // 🔑 Afegim workerName i workerRole al torn principal
    return out.filter((t) => {
      if (!Array.isArray(t.__rawWorkers)) return false
      const matchWorker = t.__rawWorkers.find((w) => norm(w.name) === norm(workerName))
      if (matchWorker) {
        ;(t as any).workerName = matchWorker.name
        ;(t as any).workerRole = matchWorker.role
        return true
      }
      return false
    })
  }
  return []
}


    // ── 2. Cap Departament → tots els torns del seu departament
    if (role === 'Cap Departament') {
      if (dep) {
        await fetchDeptCollectionRange(db, dep, startISO, endISO, out)
        return out
      }
      return []
    }

    // ── 3. Admin / Direcció → tots els departaments
    if (role === 'Admin' || role === 'Direcció') {
      if (dep) {
        // 🔎 només un departament concret si s'ha filtrat
        await fetchDeptCollectionRange(db, dep, startISO, endISO, out)
      } else {
        // 🔎 tots els departaments coneguts
        for (const d of KNOWN_DEPARTMENTS) {
          await fetchDeptCollectionRange(db, d, startISO, endISO, out)
        }
      }

      // També col·lecció genèrica "quadrants"
      const collRef = db.collection('quadrants')
      const snap2 = await collRef
        .where('status', '==', 'confirmed')
        .where('startDate', '>=', startISO)
        .where('startDate', '<=', endISO)
        .get()

      snap2.forEach((doc) => {
        const data = doc.data()
        if (!isConfirmed(data)) return
        const t = mapDocToTorn(doc.id, data, dep)
        if (!t.startDate && !t.endDate) return

        if (
          rangesOverlap(
            t.startDate || t.endDate,
            t.endDate || t.startDate,
            startISO,
            endISO
          )
        ) {
          let cur = new Date(t.startDate)
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
