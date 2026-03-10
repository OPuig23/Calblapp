import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import {
  loadMinRestHours,
  listQuadrantCollections,
  fetchQuadrantDocsByEndDate,
  QuadrantDoc,
} from '@/utils/personnelRest'

type AvailEntry = {
  id: string
  name: string
  role: string
  status: 'available' | 'conflict'
  reason: string
}

type PersonRef = {
  id?: string
  name?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
}

type OccupiedRange = {
  start: Date
  end: Date
}

interface PersonnelDoc {
  name?: string
  role?: string
  department?: string
  isDriver?: boolean
  driver?: {
    isDriver?: boolean
    camioGran?: boolean
    camioPetit?: boolean
  }
  [key: string]: unknown
}

const RESPONSABLE_ROLES = new Set([
  'responsable',
  'cap departament',
  'capdepartament',
  'supervisor',
])
const TREBALLADOR_ROLES = new Set(['equip', 'treballador', 'operari'])
const REST_MS_PER_HOUR = 3600000

const unaccent = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
const norm = (v?: string | null) => unaccent(String(v ?? '').trim().toLowerCase())

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const nid = norm(item.id)
    if (!seen.has(nid)) {
      seen.add(nid)
      out.push(item)
    }
  }
  return out
}

const buildDate = (date?: string, time?: string) =>
  new Date(`${date || ''}T${time || '00:00'}:00Z`)

const normalizeRange = (start: Date, end: Date) =>
  end <= start ? { start, end: new Date(end.getTime() + 24 * 60 * 60 * 1000) } : { start, end }

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd

const pushIndexedRange = (
  index: Map<string, OccupiedRange[]>,
  key: string | undefined,
  start: Date,
  end: Date
) => {
  const normalizedKey = norm(key)
  if (!normalizedKey) return
  const list = index.get(normalizedKey) || []
  list.push({ start, end })
  index.set(normalizedKey, list)
}

const addRangesFromRef = (
  index: Map<string, OccupiedRange[]>,
  ref: PersonRef | null,
  base: QuadrantDoc
) => {
  if (!ref) return

  const rawStart = buildDate(ref.startDate || base.startDate, ref.startTime || base.startTime)
  const rawEnd = buildDate(ref.endDate || base.endDate || base.startDate, ref.endTime || base.endTime || base.startTime)
  if (isNaN(rawStart.getTime()) || isNaN(rawEnd.getTime())) return

  const range = normalizeRange(rawStart, rawEnd)
  pushIndexedRange(index, ref.id, range.start, range.end)
  pushIndexedRange(index, ref.name, range.start, range.end)
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deptParam = searchParams.get('department')
  const sd = searchParams.get('startDate')
  const st = searchParams.get('startTime')
  const ed = searchParams.get('endDate')
  const et = searchParams.get('endTime')
  const excludeEventId = searchParams.get('excludeEventId')

  if (!deptParam || !sd || !ed) {
    return NextResponse.json(
      { responsables: [], conductors: [], treballadors: [], error: 'Missing parameters' },
      { status: 400 }
    )
  }

  try {
    const deptNorm = norm(deptParam)
    const reqStart = buildDate(sd, st || '00:00')
    const reqEnd = buildDate(ed, et || '23:59')
    const reqRange = normalizeRange(reqStart, reqEnd)
    const minRest = await loadMinRestHours(deptNorm)

    const occupancyIndex = new Map<string, OccupiedRange[]>()
    const colIds = await listQuadrantCollections()

    for (const colId of colIds) {
      try {
        const docs = await fetchQuadrantDocsByEndDate(colId, ed)
        docs.forEach((docSnap) => {
          if (excludeEventId && docSnap.id === excludeEventId) return
          const q = docSnap.data() as QuadrantDoc & { eventId?: string }
          if (excludeEventId && q?.eventId === excludeEventId) return

          addRangesFromRef(occupancyIndex, q.responsable || null, q)
          if (q.responsableName) addRangesFromRef(occupancyIndex, { name: q.responsableName }, q)
          if (Array.isArray(q.responsables)) q.responsables.forEach((line) => addRangesFromRef(occupancyIndex, line, q))
          if (Array.isArray(q.conductors)) q.conductors.forEach((line) => addRangesFromRef(occupancyIndex, line, q))
          if (Array.isArray(q.treballadors)) q.treballadors.forEach((line) => addRangesFromRef(occupancyIndex, line, q))
          if (Array.isArray(q.brigades)) q.brigades.forEach((line) => addRangesFromRef(occupancyIndex, line, q))
          if (Array.isArray(q.groups)) {
            q.groups.forEach((group) => {
              addRangesFromRef(
                occupancyIndex,
                {
                  id: group.responsibleId || undefined,
                  name: group.responsibleName || undefined,
                  startDate: group.startDate,
                  startTime: group.startTime,
                  endDate: group.endDate,
                  endTime: group.endTime,
                },
                q
              )
            })
          }
        })
      } catch (error) {
        console.error(`[available] Error reading ${colId}:`, error)
      }
    }

    const personnelSnap = await db.collection('personnel').get()
    const deptPersonnel = personnelSnap.docs.filter((doc) => {
      const data = doc.data() as PersonnelDoc
      return norm(data.department) === deptNorm
    })

    const responsables: AvailEntry[] = []
    const workers: AvailEntry[] = []
    const conductors: AvailEntry[] = []

    for (const doc of deptPersonnel) {
      const data = doc.data() as PersonnelDoc
      const roleNorm = norm(data.role)
      const personRanges = [
        ...(occupancyIndex.get(norm(doc.id)) || []),
        ...(occupancyIndex.get(norm(data.name)) || []),
      ]

      let hasOverlap = false
      let hasRestViolation = false

      for (const range of personRanges) {
        if (overlaps(reqRange.start, reqRange.end, range.start, range.end)) {
          hasOverlap = true
          break
        }

        const gapBefore = reqRange.start.getTime() - range.end.getTime()
        const gapAfter = range.start.getTime() - reqRange.end.getTime()
        if (gapBefore < minRest * REST_MS_PER_HOUR && gapAfter < minRest * REST_MS_PER_HOUR) {
          hasRestViolation = true
          break
        }
      }

      const isAvailable = !hasOverlap && !hasRestViolation
      const reason = hasOverlap
        ? 'Ja assignat en aquest rang'
        : hasRestViolation
        ? `No compleix descans minim (${minRest}h)`
        : ''

      const entry: AvailEntry = {
        id: doc.id,
        name: data.name || '',
        role: data.role || '',
        status: isAvailable ? 'available' : 'conflict',
        reason,
      }

      if (RESPONSABLE_ROLES.has(roleNorm)) {
        responsables.push(entry)
        workers.push(entry)
      }
      if (TREBALLADOR_ROLES.has(roleNorm)) {
        workers.push(entry)
      }

      const isDriver =
        data.isDriver === true ||
        data.driver?.isDriver === true ||
        data.driver?.camioGran === true ||
        data.driver?.camioPetit === true

      if (isDriver) {
        conductors.push(entry)
      }
    }

    const sortEntries = (items: AvailEntry[]) =>
      uniqueById(items).sort((a, b) =>
        a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'available' ? -1 : 1
      )

    return NextResponse.json({
      responsables: sortEntries(responsables).filter((p) => p.status === 'available'),
      conductors: sortEntries(conductors).filter((p) => p.status === 'available'),
      treballadors: sortEntries(workers).filter((p) => p.status === 'available'),
    })
  } catch (err: unknown) {
    console.error('Error GET /api/personnel/available:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
