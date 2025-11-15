// =============================================
//  API: /api/quadrants/get
//  Carrega quadrants per departament i rang
//  Correcció final Oriol 💪
// =============================================

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

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

    // 1️⃣ Intent string dates
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

    console.log('📈 [quadrants/get] Documents trobats:', snapshot.size)

    const results = snapshot.docs.map(doc => {
      const d = doc.data() as any

      // 👇 Unifiquem el codi de l’esdeveniment
      const code = d.code || d.eventCode || d.eventId || doc.id

      return {
        id: doc.id,

        // 👈 PUNT CRÍTIC QUE FALTAVA
        code,                 // per fer match amb /menu/quadrants
        eventCode: code,      // per compatibilitat

        eventName: d.eventName || d.name || '',
        location: d.location || d.finca || '',

        startDate: d.startDate?.toDate
          ? d.startDate.toDate().toISOString().slice(0, 10)
          : d.startDate || '',

        endDate: d.endDate?.toDate
          ? d.endDate.toDate().toISOString().slice(0, 10)
          : d.endDate || '',

        startTime: d.startTime || '',
        endTime: d.endTime || '',

        responsable: d.responsable?.name || '',
        conductors: Array.isArray(d.conductors) ? d.conductors : [],
        treballadors: Array.isArray(d.treballadors) ? d.treballadors : [],

        pax: d.pax || 0,
        dressCode: d.dressCode || '',
        department,

        // ✔ Status real. Si no existeix → pendent (string buit)
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
