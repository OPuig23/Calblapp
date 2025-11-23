// src/app/api/quadrants/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import { autoAssign } from '@/services/autoAssign'

export const runtime = 'nodejs'

// Helpers
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (v?: string | null) => unaccent((v || '').toString().trim().toLowerCase())
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

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

    // 🔎 Log dels conductors retornats per autoAssign
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

    // 🔑 Afegir brigades si venen del body
    if (Array.isArray(body.brigades)) {
      toSave.brigades = body.brigades as Brigade[]
    }
// 🔹 Determinem la col·lecció segons el departament
const collectionName = await resolveWriteCollectionForDepartment(deptNorm)
console.log('[quadrants/route] 🗂️ Escriuré a col·lecció:', collectionName)

// 🧩 Si el code no arriba del front, recuperem el del stage_verd
if (!toSave.code) {
  const stageSnap = await db.collection('stage_verd').doc(body.eventId).get()
  const stageData = stageSnap.exists ? stageSnap.data() : null
  toSave.code = stageData?.code || stageData?.C_digo || ''
}

    // Desa a la col·lecció específica del departament (ex.: quadrantsLogistica)
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
