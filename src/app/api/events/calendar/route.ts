// ✅ file: src/app/api/events/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'Falten start i end' }, { status: 400 })
    }

    // 🔹 Llegim totes les col·leccions del Firestore
    const collections = ['stage_verd', 'stage_taronja', 'stage_blau']
    const base: Record<string, unknown>[] = []

    for (const coll of collections) {
      console.log(`[events/calendar] 🔍 Llegint Firestore: ${coll}`)
      const snap = await db.collection(coll).get()

      snap.forEach((doc) => {
        const d = doc.data() as FirebaseFirestore.DocumentData
        console.log(`[${coll}] 🔹 Comercial:`, d.Comercial, '| Servei:', d.Servei, '| NumPax:', d.NumPax)


        const startISO =
          typeof d.DataInici === 'string' ? `${d.DataInici}T00:00:00.000Z` : null
        const endISO =
          typeof d.DataFi === 'string'
            ? `${d.DataFi}T00:00:00.000Z`
            : startISO
        const rawSummary = typeof d.NomEvent === 'string' ? d.NomEvent : '(Sense títol)'
        const summary = rawSummary.split('/')[0].trim()
        const location = (d.Ubicacio ?? '')
          .split('(')[0]
          .split('/')[0]
          .replace(/^ZZ\s*/i, '')
          .trim()
        const lnValue = typeof d.LN === 'string' ? d.LN : 'Altres'

   base.push({
  id: doc.id,
  summary,
  start: startISO,
  end: endISO,
  day: startISO ? startISO.slice(0, 10) : '',
  location,
  lnKey: lnValue.toLowerCase(),
  lnLabel: lnValue,
  collection: coll,

  // 🆕 Camps addicionals
  comercial: d.Comercial || d.comercial || '',
  servei: d.Servei || d.servei || '',
  numPax: d.NumPax || d.numPax || 0,
  stageGroup: d.StageGroup || d.stageGroup || '',

  // 🕒 Afegim hora d'inici
  HoraInici: d.HoraInici || d.horaInici || '',
})
if (d.HoraInici) console.log(`[${coll}] 🕒 HoraInici detectada:`, d.HoraInici)

      })
    }

    console.log(`[events/calendar] 📦 Total esdeveniments trobats: ${base.length}`)
    return NextResponse.json({ events: base }, { status: 200 })
  } catch (err) {
    console.error('[api/events/calendar] ❌ Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
