// src/app/api/quadrants/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'
import { autoAssign } from '@/services/autoAssign'

export const runtime = 'nodejs'

// Helpers
const unaccent = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const norm = (v?: string | null) => unaccent((v || '').toString().trim().toLowerCase())
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Construeix el nom de col·lecció per departament: quadrantsLogistica, quadrantsServeis, ... */
function collectionForDepartment(department: string) {
  const d = capitalize(norm(department))
  return `quadrants${d}` // ex: "logistica" -> "quadrantsLogistica"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const required = ['eventId', 'department', 'startDate', 'endDate']
    for (const k of required) {
      if (!body?.[k]) {
        return NextResponse.json({ success: false, error: `Missing ${k}` }, { status: 400 })
      }
    }

    // Orquestrador
    const { assignment, meta } = await autoAssign(body)

    const deptNorm = norm(String(body.department || ''))

    // 🔎 Log dels conductors retornats per autoAssign
    console.log('[quadrants/route] assignment.drivers:', assignment.drivers)

    const toSave = {
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

      // Responsable
      responsableName: assignment.responsible?.name || null,
      responsable: assignment.responsible
        ? { name: assignment.responsible.name, meetingPoint: body.meetingPoint || '' }
        : null,

      // Conductors amb matrícula i tipus
      conductors: (assignment.drivers || []).map(d => ({
        name: d.name,
        meetingPoint: d.meetingPoint || body.meetingPoint || '',
        plate: d.plate || '',        // 👈 guardem vehiclePlate a Firestore com plate
        vehicleType: d.vehicleType || ''    // 👈 si arriba vehicleType també
      })),

      // Treballadors
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
  toSave.brigades = body.brigades
}

    // Desa a la col·lecció específica del departament (ex.: quadrantsLogistica)
    const collectionName = collectionForDepartment(deptNorm)
    await firestore.collection(collectionName).doc(body.eventId).set(toSave, { merge: true })

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
  } catch (e: any) {
    console.error('[quadrants/route] error:', e)
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}
