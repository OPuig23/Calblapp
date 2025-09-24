//file: src/app/api/quadrants/list/route.ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { normalizeRole as normalizeRoleCore } from '@/lib/roles'

export const runtime = 'nodejs'

type Person = {
  id: string
  name: string
  meetingPoint?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
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
  location?: string
  totalWorkers: number
  numDrivers: number
  responsableId?: string
  responsableName?: string
  responsable?: Person | null
  conductors?: Person[]
  treballadors?: Person[]
  updatedAt: string
  status: 'confirmed' | 'draft'
  confirmedAt?: string | null
  confirmed?: boolean
}

const KNOWN_DEPTS = ['logistica', 'serveis', 'cuina', 'transport'] as const
type Dept = string

/* ---------- Utils ---------- */
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

/* ---------- Resolució col·leccions quadrants* ---------- */
function normalizeColId(id: string): string {
  const rest = id.replace(/^quadrants/i, '')
  return rest.replace(/[_\-\s]/g, '')
             .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
             .toLowerCase()
}

const COLS_MAP: Record<string, string> = {}
let COLS_LOADED = false

async function loadCollectionsMap() {
  if (COLS_LOADED) return
  const cols = await db.listCollections()
  cols.forEach(c => {
    const key = normalizeColId(c.id)
    if (key) COLS_MAP[key] = c.id
  })
  COLS_LOADED = true
  console.log('[quadrants/list] 🔄 Collections map carregat:', COLS_MAP)
}

async function resolveColForDept(dept: Dept): Promise<string | undefined> {
  await loadCollectionsMap()
  return COLS_MAP[dept.toLowerCase()]
}

/* ---------- Helpers ---------- */
const readMp = (o: any) =>
  o?.meetingPoint ?? o?.meetingpoint ?? o?.meeting_point ?? ''

const mapPerson = (p: any, doc?: any): Person => ({
  id: p?.id ?? '',
  name: p?.name ?? '',
  meetingPoint: readMp(p) || readMp(doc),
  startDate: p?.startDate ?? doc?.startDate ?? '',
  startTime: p?.startTime ?? doc?.startTime ?? '',
  endDate: p?.endDate ?? doc?.endDate ?? '',
  endTime: p?.endTime ?? doc?.endTime ?? '',
  plate: p?.plate ?? '',
  vehicleType: p?.vehicleType ?? p?.type ?? '',
})

/* ---------- Query ---------- */
async function fetchDeptDrafts(dept: Dept, start?: string, end?: string) {
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

  return snap.docs.map((doc) => {
    const d = doc.data() as any

    const statusRaw = String(d?.status ?? '').toLowerCase()
    const status: 'confirmed' | 'draft' =
      statusRaw === 'confirmed' ? 'confirmed' : 'draft'

    const confirmedAtVal = d?.confirmedAt
    const confirmedAt =
      confirmedAtVal?.toDate
        ? confirmedAtVal.toDate().toISOString()
        : (confirmedAtVal || null)

    const confirmed =
      status === 'confirmed' ||
      !!confirmedAt ||
      !!d?.confirmada ||
      !!d?.confirmed

    const updated =
      typeof d.updatedAt?.toDate === 'function'
        ? d.updatedAt.toDate().toISOString()
        : (d.updatedAt || new Date().toISOString())

    const out: Draft = {
  id: doc.id,
  code: d.code || '',
  eventName: d.eventName || '',
  department: normalizeDept(d.department || dept),
  startDate: d.startDate || '',
  startTime: d.startTime || '',
  endDate: d.endDate || '',
  endTime: d.endTime || '',
  location: d.location || '',
  totalWorkers: Number(d.totalWorkers || 0),
  numDrivers: Number(d.numDrivers || 0),
  responsableId: d.responsableId || '',
  responsableName: d.responsableName || '',
  conductors: Array.isArray(d.conductors)
    ? d.conductors.map((p: any) => mapPerson(p, d))
    : [],
  treballadors: Array.isArray(d.treballadors)
    ? d.treballadors.map((p: any) => mapPerson(p, d))
    : [],
  brigades: Array.isArray(d.brigades)
    ? d.brigades.map((b: any) => ({
        id: b.id || '',
        name: b.name || '',
        workers: Number(b.workers || 0),
        startTime: b.startTime || '',
        endTime: b.endTime || ''
      }))
    : [],
  responsable: d.responsable
    ? mapPerson(d.responsable, d)
    : d.responsableId
    ? {
        id: d.responsableId,
        name: d.responsableName || '',
        meetingPoint: d.meetingPoint || '',
      }
    : null,
  updatedAt: updated,
  status,
  confirmedAt,
  confirmed,
}

    return out
  })
}

/* ---------- Handler ---------- */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ drafts: [] }, { status: 401 })

    const sessDept = normalizeDept(String(
      (token as any).department ??
      (token as any).userDepartment ??
      (token as any).dept ??
      (token as any).departmentName ??
      ''
    ))

    const roleRaw = String((token as any).userRole ?? (token as any).role ?? '')
    const roleNorm = normalizeRoleCore(roleRaw)
    const role = roleNorm === 'cap' ? 'cap departament' : roleNorm

    const { searchParams } = new URL(req.url)
    const qsDept = normalizeDept(searchParams.get('department') || '')
    const qsStart = searchParams.get('start') || ''
    const qsEnd   = searchParams.get('end') || ''
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
    } else if (role === 'admin' || role === 'direccio' || role === 'direccion') {
      if (qsDept && qsDept !== 'all' && existing.includes(qsDept)) {
        deptsToFetch = [qsDept]
      } else {
        deptsToFetch = existing
      }
    } else {
      console.warn('[quadrants/list] ❌ Accés denegat per rol', { role })
      return NextResponse.json({ drafts: [], range: { start, end } }, { status: 403 })
    }

    console.log('[quadrants/list] 🎯 Fetching drafts', {
      role,
      sessDept,
      qsDept,
      deptsToFetch,
      start,
      end
    })

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

    // Logs finals
    console.table(drafts.map(d => ({
      id: d.id,
      code: d.code,
      dept: d.department,
      startDate: d.startDate,
      status: d.status
    })))
    console.log('[quadrants/list] ✅ Resum resposta', {
      draftsCount: drafts.length,
      firstDraft: drafts[0]
    })

    return NextResponse.json({ drafts, range: { start, end } })
  } catch (err) {
    console.error('[quadrants/list] 💥 Error GET:', err)
    return NextResponse.json({ drafts: [] }, { status: 200 })
  }
}
