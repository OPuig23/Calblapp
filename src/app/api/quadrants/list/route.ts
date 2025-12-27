// ✅ file: src/app/api/quadrants/list/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole as normalizeRoleCore } from '@/lib/roles'

/* ──────────────────────────────────────────────────────────────────────────
   Tipus: documents a Firestore (acceptem diversos noms de camps històrics)
────────────────────────────────────────────────────────────────────────── */
interface FirestorePerson {
  id?: string
  name?: string
  meetingPoint?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  arrivalTime?: string
  plate?: string
  vehicleType?: string
  type?: string
  [key: string]: unknown
}

interface FirestoreBrigade {
  id?: string
  name?: string
  workers?: number
  startTime?: string
  endTime?: string
  [key: string]: unknown
}

interface FirestoreDraftDoc {
  // camps “moderns”
  id?: string
  code?: string
  eventName?: string
  department?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  location?: string
  totalWorkers?: number
  numDrivers?: number
  responsableId?: string
  responsableName?: string
  responsable?: FirestorePerson
  conductors?: FirestorePerson[]
  treballadors?: FirestorePerson[]
  brigades?: FirestoreBrigade[]
  updatedAt?: { toDate?: () => Date } | string
  status?: string
  confirmedAt?: { toDate?: () => Date } | string
  confirmada?: boolean
  confirmed?: boolean
  meetingPoint?: string

  // alias heretats de les col·leccions d’esdeveniments originals
  HoraInici?: string
  horaInici?: string
  HoraFi?: string
  horaFi?: string
  DataInici?: string
  DataFi?: string
  Ubicacio?: string

  [key: string]: unknown
}

/* ──────────────────────────────────────────────────────────────────────────
   Tipus de sortida del servei
────────────────────────────────────────────────────────────────────────── */
export const runtime = 'nodejs'

type Person = {
  id: string
  name: string
  meetingPoint?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  arrivalTime?: string
  plate?: string
  vehicleType?: string
}

type Draft = {
  id: string
  code: string
  eventName: string
  department: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  arrivalTime?: string
  location?: string
  totalWorkers: number
  numDrivers: number
  responsableId?: string
  responsableName?: string
  responsable?: Person | null
  conductors: Person[]
  treballadors: Person[]
  brigades: {
    id: string
    name: string
    workers: number
    startTime: string
    endTime: string
  }[]
  updatedAt: string
  status: 'confirmed' | 'draft'
  confirmedAt?: string | null
  confirmed: boolean
}

type Dept = string

/* ──────────────────────────────────────────────────────────────────────────
   Utils
────────────────────────────────────────────────────────────────────────── */
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normalizeDept = (raw: string) => unaccent(String(raw || '').toLowerCase().trim())

function toYMD(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function currentWeekRangeYMD() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (today.getDay() + 6) % 7 // dilluns=0
  const monday = new Date(today); monday.setDate(today.getDate() - dow)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  return { start: toYMD(monday), end: toYMD(sunday) }
}

/* ──────────────────────────────────────────────────────────────────────────
   Resolució col·leccions: quadrantsLogistica / quadrantsCuina / ...
────────────────────────────────────────────────────────────────────────── */
function normalizeColId(id: string): string {
  // ✅ accepta tant "quadrant" com "quadrants" al nom
  const rest = id
    .replace(/^quadrants?/i, '') // <-- canvi clau: la “s” passa a opcional
    .replace(/[_\-\s]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return rest
}


const COLS_MAP: Record<string, string> = {}
let COLS_LOADED = false

async function loadCollectionsMap() {
  if (COLS_LOADED) return
  const cols = await db.listCollections()
  console.log('[quadrants/list] 📚 Col·leccions detectades:', cols.map(c => c.id))
  console.log(
  '[quadrants/list] 📚 Col·leccions trobades:',
  cols.map((c) => c.id)
)

  cols.forEach(c => {
    const key = normalizeColId(c.id)
    if (key) COLS_MAP[key] = c.id
  })
  COLS_LOADED = true
  console.log('[quadrants/list] 🔄 Collections map carregat:', COLS_MAP)
  console.log('[quadrants/list] 🧭 Clau per "serveis":', COLS_MAP['serveis'])

}

async function resolveColForDept(dept: Dept): Promise<string | undefined> {
  await loadCollectionsMap()
  return COLS_MAP[dept.toLowerCase()]
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers de camp/persona
────────────────────────────────────────────────────────────────────────── */
const readMp = (o?: Partial<FirestorePerson>): string => {
  if (!o) return ''
  if (typeof o.meetingPoint === 'string') return o.meetingPoint
  if ('meetingpoint' in o && typeof (o as { meetingpoint?: string }).meetingpoint === 'string') {
    return (o as { meetingpoint: string }).meetingpoint
  }
  if ('meeting_point' in o && typeof (o as { meeting_point?: string }).meeting_point === 'string') {
    return (o as { meeting_point: string }).meeting_point
  }
  return ''
}

const mapPerson = (p: FirestorePerson, doc?: FirestoreDraftDoc): Person => ({
  id: p?.id ?? '',
  name: p?.name ?? '',
  meetingPoint: readMp(p) || readMp(doc as FirestorePerson),
  startDate: p?.startDate ?? doc?.startDate ?? '',
  startTime: p?.startTime ?? doc?.startTime ?? '',
  endDate: p?.endDate ?? doc?.endDate ?? '',
  endTime: p?.endTime ?? doc?.endTime ?? '',
  arrivalTime: p?.arrivalTime ?? (doc as FirestorePerson)?.arrivalTime ?? '',
  plate: p?.plate ?? '',
  vehicleType: p?.vehicleType ?? p?.type ?? '',
})

/* ──────────────────────────────────────────────────────────────────────────
   Query principal (carrega drafts d’un departament)
────────────────────────────────────────────────────────────────────────── */
async function fetchDeptDrafts(
  dept: Dept,
  start?: string,
  end?: string
): Promise<Draft[]> {
  const colName = await resolveColForDept(dept)
  if (!colName) {
    console.warn('[quadrants/list] ❌ No col·lecció trobada per dept:', dept)
    return []
  }

  console.log(`[quadrants/list] 🔍 Queryant col·lecció: ${colName}`, { start, end })

  let ref: FirebaseFirestore.Query = db.collection(colName)
  if (start) ref = ref.where('startDate', '>=', start)
  if (end)   ref = ref.where('startDate', '<=', end)
  ref = ref.orderBy('startDate', 'asc').orderBy('startTime', 'asc')

  const snap = await ref.get()
  console.log(`[quadrants/list] 📥 ${snap.size} documents trobats a ${colName}`)

  const drafts: Draft[] = snap.docs.map((doc) => {
    const d = doc.data() as FirestoreDraftDoc

    // 🧪 LOG: estat tal com arriba del document
    console.log(
      `[quadrants/list] ▶️ Doc ${doc.id} status (raw):`,
      d?.status,
      '| confirmada:', d?.confirmada,
      '| confirmed:', d?.confirmed
    )

    const statusRaw = String(d?.status ?? '').toLowerCase()
    const status: 'confirmed' | 'draft' =
      statusRaw === 'confirmed' ? 'confirmed' : 'draft'

    // 🧪 LOG: estat normalitzat
    console.log(`[quadrants/list] ✅ Doc ${doc.id} status (normalized):`, status)

    const confirmedAtVal = d?.confirmedAt as { toDate?: () => Date } | string | undefined
    const confirmedAt =
      (typeof confirmedAtVal === 'object' && confirmedAtVal?.toDate)
        ? confirmedAtVal.toDate().toISOString()
        : (typeof confirmedAtVal === 'string' ? confirmedAtVal : null)

    const confirmed =
      status === 'confirmed' ||
      !!confirmedAt ||
      !!d?.confirmada ||
      !!d?.confirmed

    const updatedAtVal = d?.updatedAt as { toDate?: () => Date } | string | undefined
    const updated =
      (typeof updatedAtVal === 'object' && updatedAtVal?.toDate)
        ? updatedAtVal.toDate().toISOString()
        : (typeof updatedAtVal === 'string' ? updatedAtVal : new Date().toISOString())

    // 🕒 Normalize start/end date/time acceptant alias
    const startDate = d.startDate || d.DataInici || ''
    const endDate   = d.endDate   || d.DataFi    || ''

    const startTime =
      d.startTime || d.HoraInici || d.horaInici || ''

    const endTime =
      d.endTime || d.HoraFi || d.horaFi || ''

    const location = d.location || d.Ubicacio || ''

    return {
      id: doc.id,
      code: d.code || '',
      eventName: d.eventName || '',
      department: normalizeDept(d.department || dept),
      startDate,
      startTime,
      endDate,
      endTime,
      location,
      arrivalTime: d.arrivalTime || '',
      totalWorkers: Number(d.totalWorkers || 0),
      numDrivers: Number(d.numDrivers || 0),
      responsableId: d.responsableId || '',
      responsableName: d.responsableName || '',
      conductors: Array.isArray(d.conductors)
        ? d.conductors.map((p) => mapPerson(p, d))
        : [],
      treballadors: Array.isArray(d.treballadors)
        ? d.treballadors.map((p) => mapPerson(p, d))
        : [],
      brigades: Array.isArray(d.brigades)
        ? d.brigades.map((b) => ({
            id: b.id || '',
            name: b.name || '',
            workers: Number(b.workers || 0),
            startTime: b.startTime || '',
            endTime: b.endTime || '',
          }))
        : [],
      responsable: d.responsable
        ? mapPerson(d.responsable, d)
        : d.responsableId
        ? {
            id: d.responsableId,
            name: d.responsableName || '',
            meetingPoint: d.meetingPoint || '',
            arrivalTime: d.arrivalTime || '',
          }
        : null,
      updatedAt: updated,
      status,
      confirmedAt,
      confirmed,
      service: d.service || d.Servei || null,
      numPax: d.numPax || d.NumPax || null,
      commercial: d.commercial || d.Comercial || null,
    }
  })

  return drafts
}

/* ──────────────────────────────────────────────────────────────────────────
   Handler HTTP
────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      console.warn('[quadrants/list] 🔒 Sense token - 401')
      return NextResponse.json({ drafts: [] }, { status: 401 })
    }

    const t = token as Record<string, unknown>
    const sessDept = normalizeDept(String(
      t.department ?? t.userDepartment ?? t.dept ?? t.departmentName ?? ''
    ))

    const roleRaw = String(t.userRole ?? t.role ?? '')
    const roleNorm = normalizeRoleCore(roleRaw)
    const role = roleNorm === 'cap' ? 'cap departament' : roleNorm

    console.log('[quadrants/list] 👤 Sessió', { roleRaw, roleNorm, role, sessDept })

    const { searchParams } = new URL(req.url)
    const qsDept   = normalizeDept(searchParams.get('department') || '')
    const qsStart  = searchParams.get('start') || ''
    const qsEnd    = searchParams.get('end')   || ''
    const qsStatus = (searchParams.get('status') || 'all').toLowerCase()

    const { start: defStart, end: defEnd } = currentWeekRangeYMD()
    const start = qsStart || defStart
    const end   = qsEnd   || defEnd

    await loadCollectionsMap()
    const existing = Object.keys(COLS_MAP)

    let deptsToFetch: Dept[] = []

    if (role === 'cap departament') {
      if (sessDept && existing.includes(sessDept)) {
        deptsToFetch = [sessDept]
      } else {
        console.warn('[quadrants/list] ⚠️ Cap departament sense col·lecció vàlida', { sessDept })
        return NextResponse.json({ drafts: [], range: { start, end } })
      }
    } else if (role === 'admin' || role === 'direccio') {
      if (qsDept && qsDept !== 'all' && existing.includes(qsDept)) {
        deptsToFetch = [qsDept]
      } else {
        deptsToFetch = existing
      }
    } else {
      console.warn('[quadrants/list] ❌ Accés denegat per rol', { role })
      return NextResponse.json({ drafts: [], range: { start, end } }, { status: 403 })
    }

    console.log('[quadrants/list] 🗂️ Depts a consultar:', deptsToFetch, { start, end, qsStatus })

    const results = await Promise.all(
      deptsToFetch.map((d) => fetchDeptDrafts(d, start, end))
    )
    let drafts = results.flat().sort((a, b) => {
      const kA = `${a.startDate} ${a.startTime}`
      const kB = `${b.startDate} ${b.startTime}`
      return kA.localeCompare(kB)
    })

    if (qsStatus !== 'all') {
      drafts = drafts.filter((d) => d.status === qsStatus)
    }

    console.log('[quadrants/list] ✅ Retornant drafts:', drafts.length)
    return NextResponse.json({ drafts, range: { start, end } })
  } catch (err) {
    console.error('[quadrants/list] 💥 Error GET:', err)
    return NextResponse.json({ drafts: [] }, { status: 200 })
  }
}
