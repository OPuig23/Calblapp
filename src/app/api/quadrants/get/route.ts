// ✅ file: src/app/api/quadrants/get/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

/** Troba el nom de col·lecció existent per al departament (singular o plural). */
async function resolveReadCollectionForDepartment(department: string) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const d = department.toLowerCase().trim()
  const singular = `quadrant${cap(d)}`
  const plural   = `quadrants${cap(d)}`

  const cols = await db.listCollections()
  const names = cols.map(c => c.id)

  // Prioritza la que existeixi (a Cal Blay sovint és singular)
  if (names.includes(singular)) return singular
  if (names.includes(plural))   return plural

  // Si no existeix cap, tornem el plural per consistència (no fallarà però donarà 0)
  return plural
}

/**
 * 🔹 API GET /api/quadrants/get
 * Llegeix quadrants per departament i rang de dates (String o Timestamp).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const department = (searchParams.get('department') || 'serveis').toLowerCase()

    if (!start || !end) {
      return NextResponse.json({ error: 'Falten dates' }, { status: 400 })
    }

    const colName = await resolveReadCollectionForDepartment(department)
    const collectionRef = db.collection(colName)

    console.log('🟢 [quadrants/get] Inici consulta:')
    console.log({ colName, start, end })

    // 1r intent: camps string YYYY-MM-DD (el més habitual)
    let snapshot = await collectionRef
      .where('startDate', '<=', end)
      .where('endDate', '>=', start)
      .get()

    // 2n intent: si els camps són Timestamp
    if (snapshot.empty) {
      console.log('⚙️ Cap resultat amb string — provant amb Timestamp')
      const startDate = new Date(start)
      const endDate = new Date(end)
      snapshot = await collectionRef
        .where('startDate', '<=', endDate)
        .where('endDate', '>=', startDate)
        .get()
    }

    console.log('📈 [quadrants/get] Nombre de docs trobats:', snapshot.size)

    const results = snapshot.docs.map((doc) => {
      const d = doc.data() as any
      return {
        id: doc.id,
        eventCode: d.eventCode || d.code || doc.id,
        eventName: d.eventName || d.name || '',
        location: d.location || d.finca || '',
        startDate: d.startDate?.toDate ? d.startDate.toDate().toISOString().slice(0, 10) : (d.startDate || ''),
        endDate:   d.endDate?.toDate   ? d.endDate.toDate().toISOString().slice(0, 10)   : (d.endDate   || ''),
        startTime: d.startTime || '',
        endTime: d.endTime || '',
        responsable: d.responsable?.name || '',
        conductors: Array.isArray(d.conductors) ? d.conductors : [],
        treballadors: Array.isArray(d.treballadors) ? d.treballadors : [],
        pax: d.pax || 0,
        dressCode: d.dressCode || '',
        department,
        status: d.status || 'draft',
      }
    })

    console.log(`✅ [quadrants/get] Resultats retornats: ${results.length}`)
    return NextResponse.json({ quadrants: results })
  } catch (e: unknown) {
    console.error('❌ [quadrants/get] ERROR DETALLAT:', e)
    return NextResponse.json(
      { error: (e as any)?.message || 'Error intern del servidor' },
      { status: 500 }
    )
  }
}
