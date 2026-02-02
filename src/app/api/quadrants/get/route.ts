//file: src/app/api/quadrants/get/route.ts

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

// Normalització simple i robusta
const normalize = (s?: string | null): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/** 🔍 Resol la col·lecció real de Firestore pel departament. */
async function resolveReadCollectionForDepartment(department: string) {
  const d = normalize(department)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const singular = `quadrant${cap(d)}`
  const plural = `quadrants${cap(d)}`

  const cols = await db.listCollections()
  const names = cols.map(c => c.id)

  const map = names.reduce((acc, name) => {
    acc[normalize(name)] = name
    return acc
  }, {} as Record<string, string>)

  if (map[normalize(singular)]) return map[normalize(singular)]
  if (map[normalize(plural)]) return map[normalize(plural)]

  return plural
}

/** ============================================
 *     GET /api/quadrants/get
 * ============================================ */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const departmentRaw = searchParams.get('department') || 'serveis'
    const department = normalize(departmentRaw)

    if (!start || !end) {
      return NextResponse.json({ error: 'Falten dates' }, { status: 400 })
    }

    const colName = await resolveReadCollectionForDepartment(department)
    const collectionRef = db.collection(colName)

    console.log('🟢 [quadrants/get] Consulta:', {
      colName,
      start,
      end,
      departmentRaw,
      department,
    })

    // 1️⃣ Intent string dates (startDate/endDate)
    let snapshot = await collectionRef
      .where('startDate', '<=', end)
      .where('endDate', '>=', start)
      .get()

    // 2️⃣ Intent Timestamp
    if (snapshot.empty) {
      console.log('⚙️ [quadrants/get] Provant Timestamp')
      const startDate = new Date(start)
      const endDate = new Date(end)
      snapshot = await collectionRef
        .where('startDate', '<=', endDate)
        .where('endDate', '>=', startDate)
        .get()
    }

    // 3️⃣ Fases amb phaseDate (per documents separats)
    let phaseSnapshot = await collectionRef
      .where('phaseDate', '>=', start)
      .where('phaseDate', '<=', end)
      .get()

    // Unió de resultats (evita duplicats)
    const combinedDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()
    snapshot.docs.forEach((doc) => combinedDocs.set(doc.id, doc))
    phaseSnapshot.docs.forEach((doc) => combinedDocs.set(doc.id, doc))

    console.log('📈 [quadrants/get] Documents trobats:', combinedDocs.size)

const results = Array.from(combinedDocs.values()).map(doc => {
  const d = doc.data() as any
  // 🟦 Calcular hores reals a partir de les línies del quadrant
const allRows = [
  d.responsable ? d.responsable : null,
  ...(Array.isArray(d.conductors) ? d.conductors : []),
  ...(Array.isArray(d.treballadors) ? d.treballadors : []),
  ...(Array.isArray(d.brigades) ? d.brigades : []),
].filter(Boolean);

// extreure totes les hores d'inici / fi presents
const startTimes = allRows
  .map(r => r.startTime)
  .filter(Boolean)
  .sort();

const endTimes = allRows
  .map(r => r.endTime)
  .filter(Boolean)
  .sort();

// 🟦 RESULTAT DERIVAT DELS TREBALLADORS
const derivedStartTime = startTimes.length > 0 ? startTimes[0] : null;
const derivedEndTime   = endTimes.length > 0 ? endTimes[endTimes.length - 1] : null;


  const code = d.code || d.eventCode || d.eventId || doc.id

  return {
    id: doc.id,
    eventId: d.eventId || '',
    code,
    eventCode: code,

    eventName: d.eventName || d.name || '',
    location: d.location || d.finca || '',
    meetingPoint: d.meetingPoint || '',
    arrivalTime: d.arrivalTime || '',

    startDate: d.startDate?.toDate
      ? d.startDate.toDate().toISOString().slice(0, 10)
      : d.startDate || d.phaseDate || '',

    endDate: d.endDate?.toDate
      ? d.endDate.toDate().toISOString().slice(0, 10)
      : d.endDate || d.phaseDate || d.startDate || '',

    startTime: derivedStartTime || d.startTime || '',
endTime:   derivedEndTime   || d.endTime   || '',


  // ⭐ MULTI-RESPONSABLE
responsables: Array.isArray(d.responsables) ? d.responsables : [],

// ⭐ RESTA DE ROLS
conductors: Array.isArray(d.conductors) ? d.conductors : [],
treballadors: Array.isArray(d.treballadors) ? d.treballadors : [],
brigades: Array.isArray(d.brigades) ? d.brigades : [],

// ⭐ CAMP DE COMPATIBILITAT ANTIC (temporal)
responsableName:
  Array.isArray(d.responsables) && d.responsables.length > 0
    ? d.responsables.map(r => r.name).join(', ')
    : d.responsableName || d.responsable?.name || '',


    pax: d.pax || d.numPax || 0,
    dressCode: d.dressCode || '',
    department,

    // ⭐⭐⭐ AQUI LA CLAU: SERVEI / SERVICE ⭐⭐⭐
    service: d.service || d.servei || d.eventService || null,
    phaseType: d.phaseType || d.phaseLabel || '',
    phaseLabel: d.phaseLabel || '',
    phaseDate: d.phaseDate || '',

    commercial: d.commercial || null,
    totalWorkers: Number(d.totalWorkers || 0),
    numDrivers: Number(d.numDrivers || 0),

    groups: Array.isArray(d.groups)
      ? d.groups.map((g: any) => ({
          serviceDate: g.serviceDate || '',
          dateLabel: g.dateLabel || '',
          meetingPoint: g.meetingPoint || '',
          startTime: g.startTime || '',
          arrivalTime: g.arrivalTime ?? null,
          endTime: g.endTime || '',
          workers: Number(g.workers || 0),
          drivers: Number(g.drivers || 0),
          needsDriver: !!g.needsDriver,
          driverId: g.driverId || null,
          driverName: g.driverName || null,
          responsibleId: g.responsibleId || null,
          responsibleName: g.responsibleName || null,
        }))
      : undefined,
    logisticaPhases: Array.isArray(d.logisticaPhases)
      ? d.logisticaPhases.map((p: any) => ({
          key: p.key || '',
          label: p.label || '',
          date: p.date || '',
          endDate: p.endDate || '',
          startTime: p.startTime || '',
          endTime: p.endTime || '',
          meetingPoint: p.meetingPoint || '',
          totalWorkers: Number(p.totalWorkers || 0),
          numDrivers: Number(p.numDrivers || 0),
          wantsResp: !!p.wantsResp,
          responsableId: p.responsableId || null,
          responsableName: p.responsableName || null,
          conductors: Array.isArray(p.conductors) ? p.conductors : [],
          treballadors: Array.isArray(p.treballadors) ? p.treballadors : [],
        }))
      : undefined,

    status:
      typeof d.status === 'string'
        ? d.status.toLowerCase()
        : '',
  }
})


    console.log(`✅ [quadrants/get] Quadrants retornats: ${results.length}`)
    return NextResponse.json({ quadrants: results })
  } catch (e: any) {
    console.error('❌ [quadrants/get] ERROR:', e)
    return NextResponse.json(
      { error: e?.message || 'Error intern' },
      { status: 500 }
    )
  }
}
