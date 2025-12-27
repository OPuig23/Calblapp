// src/app/api/quadrants/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import { autoAssign } from '@/services/autoAssign'

export const runtime = 'nodejs'
const ORIGIN = 'MolÃ­ Vinyals, 11, 08776 Sant Pere de Riudebitlles, Barcelona'
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

/** Construeix el nom de colÂ·lecciÃ³ per departament: quadrantsLogistica, quadrantsServeis, ... */
/** Retorna el nom de colÂ·lecciÃ³ existent per al departament (singular o plural). */
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
  responsableName: string | null
  responsable: { name: string; meetingPoint: string } | null
  conductors: Array<{ name: string; meetingPoint: string; plate: string; vehicleType: string }>
  treballadors: Array<{ name: string; meetingPoint: string }>
  needsReview: boolean
  violations: string[]
  attentionNotes: string[]
  updatedAt: string
  brigades?: Brigade[]
  service?: string | null
  arrivalTime?: string | null
  distanceKm?: number | null
  distanceCalcAt?: string | null

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

    // ðŸ”Ž Log dels conductors retornats per autoAssign
    console.log('[quadrants/route] assignment.drivers:', assignment.drivers)

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

      treballadors: (assignment.staff || []).map(s => ({
        name: s.name,
        meetingPoint: s.meetingPoint || body.meetingPoint || ''
      })),

      needsReview: !!meta.needsReview,
      violations: meta.violations || [],
      attentionNotes: meta.notes || [],
      updatedAt: new Date().toISOString()
    }

    // ðŸ”‘ Afegir brigades si venen del body
    if (Array.isArray(body.brigades)) {
      toSave.brigades = body.brigades as Brigade[]
    }
    // Determinem la col·lecció segons el departament
    const collectionName = await resolveWriteCollectionForDepartment(deptNorm)
    console.log('[quadrants/route] Escriuré a col·lecció:', collectionName)

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
