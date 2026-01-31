// src/app/api/quadrants/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import { autoAssign } from '@/services/autoAssign'

export const runtime = 'nodejs'
const ORIGIN = 'Molí Vinyals, 11, 08776 Sant Pere de Riudebitlles, Barcelona'
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

// Helpers
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (v?: string | null) => unaccent((v || '').toString().trim().toLowerCase())
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const calcDistanceKm = async (destination: string): Promise<number | null> => {
  if (!GOOGLE_KEY || !destination) return null
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', ORIGIN)
    url.searchParams.set('destinations', destination)
    url.searchParams.set('key', GOOGLE_KEY)
    url.searchParams.set('mode', 'driving')

    const res = await fetch(url.toString())
    if (!res.ok) return null
    const json = await res.json()
    const el = json?.rows?.[0]?.elements?.[0]
    if (el?.status !== 'OK') return null
    const meters = el.distance?.value
    if (!meters) return null
    return (meters / 1000) * 2 // anada + tornada
  } catch (err) {
    console.warn('[quadrants/route] distance error', err)
    return null
  }
}

/** Construeix el nom de col·lecció per departament: quadrantsLogistica, quadrantsServeis, ... */
/** Retorna el nom de col·lecció existent per al departament (singular o plural). */
async function resolveWriteCollectionForDepartment(department: string) {
  const d = capitalize(norm(department))
  const plural = `quadrants${d}`
  const singular = `quadrant${d}`

  // Comprova si existeix el singular
  const all = await db.listCollections()
  const names = all.map(c => c.id.toLowerCase())

  // Prioritza la que existeixi (singular en el teu cas actual)
  if (names.includes(singular.toLowerCase())) return singular
  if (names.includes(plural.toLowerCase())) return plural

  // Si no existeix cap, crea/escriu al plural per estandarditzar
  return plural
}


/* ================= Tipus ================= */
interface Brigade {
  id?: string
  name?: string
  workers?: number
  startTime?: string
  endTime?: string
}

interface CuinaGroup {
  meetingPoint: string
  startTime: string
  arrivalTime?: string | null
  endTime: string
  workers: number
  drivers: number
  responsibleId?: string | null
  responsibleName?: string | null
}

interface QuadrantSave {
  code: string
  eventId: string
  eventName: string
  location: string
  meetingPoint: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  department: string
  status: string
  numDrivers: number
  totalWorkers: number
  numPax?: number | null
  responsableName: string | null
  responsable: { name: string; meetingPoint: string } | null
  conductors: Array<{ name: string; meetingPoint: string; plate: string; vehicleType: string }>
  treballadors: Array<{ name: string; meetingPoint: string }>
  needsReview: boolean
  violations: string[]
  attentionNotes: string[]
  updatedAt: string
  brigades?: Brigade[]
  groups?: Array<{
    meetingPoint: string
    startTime: string
    arrivalTime?: string | null
    endTime: string
    workers: number
    drivers: number
    responsibleId?: string | null
    responsibleName?: string | null
  }>
  cuinaGroupCount?: number
  service?: string | null
  arrivalTime?: string | null
  distanceKm?: number | null
  distanceCalcAt?: string | null
  timetables?: Array<{ startTime: string; endTime: string }>

}

/* ================= Handler ================= */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const required = ['eventId', 'department', 'startDate', 'endDate']
    for (const k of required) {
      if (!body?.[k]) {
        return NextResponse.json({ success: false, error: `Missing ${k}` }, { status: 400 })
      }
    }

    // Orquestrador (ara amb tipus forts)
    const { assignment, meta } = await autoAssign(body) as {
      assignment: {
        responsible?: { name: string }
        drivers?: Array<{ name: string; meetingPoint?: string; plate?: string; vehicleType?: string }>
        staff?: Array<{ name: string; meetingPoint?: string }>
      }
      meta: {
        needsReview?: boolean
        violations?: string[]
        notes?: string[]
      }
    }

    const deptNorm = norm(String(body.department || ''))

    // ?? Log dels conductors retornats per autoAssign
    console.log('[quadrants/route] assignment.drivers:', assignment.drivers)

    const normalizeTimeField = (value: unknown) =>
      typeof value === 'string' ? value.trim() : ''

    const toTimetableEntry = ({
      startTime,
      endTime,
    }: { startTime?: unknown; endTime?: unknown }) => {
      const start = normalizeTimeField(startTime)
      const end = normalizeTimeField(endTime)
      return start && end ? { startTime: start, endTime: end } : null
    }

    const rawTimetables = Array.isArray(body.timetables) ? body.timetables : []
    const normalizedTimetables = rawTimetables
      .map((entry: any) => toTimetableEntry(entry))
      .filter((entry): entry is { startTime: string; endTime: string } => Boolean(entry))

    const staffRaw = (assignment.staff || []).filter((s) => s?.name)
    const extraCount = staffRaw.filter((s) => s.name === 'Extra').length
    const staffClean = staffRaw.filter((s) => s.name !== 'Extra')

    const toSave: QuadrantSave = {
      code: body.code || '',
      eventId: body.eventId,
      eventName: body.eventName || '',
      location: body.location || '',
      meetingPoint: body.meetingPoint || '',
      startDate: body.startDate,
      startTime: body.startTime || '00:00',
      endDate: body.endDate,
      endTime: body.endTime || '00:00',
      arrivalTime: body.arrivalTime || null,
      department: deptNorm,
      status: 'draft',
      numDrivers: Number(body.numDrivers || 0),
      totalWorkers: Number(body.totalWorkers || 0),
      numPax: body.numPax ?? null,
      service: body.service || null,

      responsableName: assignment.responsible?.name || null,
      responsable: assignment.responsible
        ? { name: assignment.responsible.name, meetingPoint: body.meetingPoint || '' }
        : null,

      conductors: (assignment.drivers || []).map(d => ({
        name: d.name,
        meetingPoint: d.meetingPoint || body.meetingPoint || '',
        plate: d.plate || '',
        vehicleType: d.vehicleType || ''
      })),

      treballadors: staffClean.map(s => ({
        name: s.name,
        meetingPoint: s.meetingPoint || body.meetingPoint || ''
      })),

      needsReview: !!meta.needsReview,
      violations: meta.violations || [],
      attentionNotes: meta.notes || [],
      updatedAt: new Date().toISOString()
      ,
      timetables: normalizedTimetables
    }

    if (Array.isArray(body.groups)) {
      let driverIdx = 0
      let workerIdx = 0
      const usedNames = new Set<string>()
      const computedGroups = (body.groups as CuinaGroup[]).map((group) => {
        const driversNeeded = Number(group.drivers || 0)
        const driversSlice = (assignment.drivers || []).slice(
          driverIdx,
          driverIdx + driversNeeded
        )
        driverIdx += driversNeeded

        let responsibleName = group.responsibleName || null
        if (responsibleName && usedNames.has(responsibleName.toLowerCase().trim())) {
          responsibleName = null
        }

        const responsibleIsDriver = !!responsibleName && driversSlice.some(
          (d) => d?.name && d.name.toLowerCase().trim() === responsibleName?.toLowerCase().trim()
        )
        const workersNeeded = Math.max(
          Number(group.workers || 0) -
            Number(group.drivers || 0),
          0
        )

        const workersSlice: Array<{ name: string; meetingPoint?: string }> = []
        while (workersSlice.length < workersNeeded) {
          const next = (assignment.staff || [])[workerIdx]
          workerIdx += 1
          if (!next) {
            workersSlice.push({ name: 'Extra' })
            continue
          }
          const normName = next.name?.toLowerCase().trim()
          if (normName && usedNames.has(normName)) continue
          workersSlice.push(next)
        }

        if (!responsibleName && deptNorm === 'cuina') {
          const candidate = [...workersSlice, ...driversSlice].find(
            (p) => p?.name && p.name !== 'Extra'
          )
          responsibleName = candidate?.name || null
        }

        const groupNames = [
          responsibleName,
          ...driversSlice.map((d) => d?.name),
          ...workersSlice.map((w) => w?.name),
        ]
          .filter((name) => typeof name === 'string' && name && name !== 'Extra')
          .map((name) => (name as string).toLowerCase().trim())
        groupNames.forEach((name) => usedNames.add(name))

        return { ...group, responsibleName }
      })

      toSave.groups = computedGroups

      if (deptNorm === 'cuina' && !toSave.responsableName && computedGroups[0]?.responsibleName) {
        toSave.responsableName = computedGroups[0].responsibleName
        toSave.responsable = {
          name: computedGroups[0].responsibleName,
          meetingPoint: computedGroups[0].meetingPoint || body.meetingPoint || '',
        }
      }
    }
    if (body.cuinaGroupCount) {
      toSave.cuinaGroupCount = Number(body.cuinaGroupCount)
    }

    // ?? Afegir brigades si venen del body + convertir "Extra" a ETT
    const baseBrigades = Array.isArray(body.brigades) ? (body.brigades as Brigade[]) : []
    if (extraCount > 0) {
      const ettLine: Brigade = {
        name: 'ETT',
        workers: extraCount,
        startTime: body.startTime || '00:00',
        endTime: body.endTime || '00:00',
      }
      const existingIdx = baseBrigades.findIndex(
        (b) => (b?.name || '').toString().trim().toLowerCase() === 'ett'
      )
      if (existingIdx >= 0) {
        const prev = baseBrigades[existingIdx]
        const prevWorkers = typeof prev?.workers === 'number' ? prev.workers : 0
        baseBrigades[existingIdx] = { ...prev, workers: prevWorkers + extraCount }
      } else {
        baseBrigades.push(ettLine)
      }
    }
    if (baseBrigades.length) {
      toSave.brigades = baseBrigades
    }
    // Determinem la col·lecció segons el departament
    const collectionName = await resolveWriteCollectionForDepartment(deptNorm)
    console.log('[quadrants/route] Escriurà a col·lecció:', collectionName)

    // Dades de stage_verd (codi i adreça)
    const stageSnap = await db.collection('stage_verd').doc(body.eventId).get()
    const stageData = stageSnap.exists ? stageSnap.data() : null

    if (!toSave.code) {
      toSave.code = stageData?.code || stageData?.C_digo || ''
    }

    // Distància (anada + tornada)
    const destination =
      stageData?.Ubicacio ||
      stageData?.location ||
      stageData?.address ||
      toSave.location
    const km = await calcDistanceKm(destination || '')
    if (km) {
      toSave.distanceKm = km
      toSave.distanceCalcAt = new Date().toISOString()
    }

    // Desa a la col·lecció específica del departament (ex.: quadrantsLogistica)
    await db.collection(collectionName).doc(body.eventId).set(toSave, { merge: true })
    await db.collection(collectionName).doc(body.eventId).set(toSave, { merge: true })

    

    // Resposta API
    return NextResponse.json({
      success: true,
      proposal: {
        responsible: assignment.responsible,
        drivers: assignment.drivers,
        staff: assignment.staff
      },
      meta
    })
  } catch (e: unknown) {
    console.error('[quadrants/route] error:', e)
    if (e instanceof Error) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}

