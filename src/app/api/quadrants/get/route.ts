// ✅ file: src/app/api/quadrants/get/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

/**
 * 🔹 API GET /api/quadrants/get
 * Llegeix quadrants per departament i rang de dates (String o Timestamp).
 * Totalment compatible amb col·leccions actuals Cal Blay.
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

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const colName = `quadrants${capitalize(department)}`
    const collectionRef = db.collection(colName)

    console.log('🟢 [quadrants/get] Inici consulta:')
    console.log({ colName, start, end })

    // 🧩 Primer intentem la query com a String (format actual de Firestore)
    let snapshot = await collectionRef
      .where('startDate', '<=', end)
      .where('endDate', '>=', start)
      .get()

    // 📅 Si no troba res, provem amb comparació per Timestamp (mixt)
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
      const d = doc.data()
      return {
        id: doc.id,
        eventCode: d.eventCode || d.code || doc.id,
        eventName: d.eventName || d.name || '',
        location: d.location || d.finca || '',
        startDate: d.startDate?.toDate
          ? d.startDate.toDate().toISOString().split('T')[0]
          : d.startDate || '',
        endDate: d.endDate?.toDate
          ? d.endDate.toDate().toISOString().split('T')[0]
          : d.endDate || '',
        startTime: d.startTime || '',
        endTime: d.endTime || '',
        responsable: d.responsable?.name || '',
        conductors: Array.isArray(d.conductors) ? d.conductors : [],
        treballadors: Array.isArray(d.treballadors) ? d.treballadors : [],
        pax: d.pax || 0,
        dressCode: d.dressCode || '',
        department,
        status: d.status || 'pendent',
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
