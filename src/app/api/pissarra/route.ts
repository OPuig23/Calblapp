//filename: src/app/api/pissarra/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

/**
 * 🔹 API /api/pissarra
 * Retorna tots els esdeveniments amb codi ple (stage_verd)
 * dins del rang setmanal indicat (start–end)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    if (!start || !end)
      return NextResponse.json({ error: 'Falten paràmetres start i end' }, { status: 400 })

    const snap = await db.collection('stage_verd').get()
    const events: any[] = []

    for (const doc of snap.docs) {
      const d = doc.data() as any
      if (!d.code) continue

     // 🔹 Normalitzem la data d'inici
const startDate =
  d.startDate ||
  d.date ||
  d.start ||
  d.DataInici ||  // ✅ camp real del teu Firestore
  d.dataInici ||
  d.DataInicio ||
  d.start_time ||
  null

if (!startDate) continue


      // 🔹 Filtratge per rang setmanal
      if (startDate < start || startDate > end) continue

      // 🔹 Busquem responsable a quadrantsServeis
      let responsableName
      try {
        const q = await db.collection('quadrantsServeis').where('code', '==', d.code).limit(1).get()
        if (!q.empty) {
          const data = q.docs[0].data() as any
          responsableName = data?.responsableName || data?.responsable?.name
        }
      } catch {}

 events.push({
  id: doc.id,
  code: d.code,
  LN: d.LN || d.ln || d.lineaNegoci || '',
  eventName: d.eventName || d.NomEvent || d.title || '',
  startDate,
  startTime: d.startTime || d.HoraInici || '',
  location: d.location || d.Ubicacio || '',
  pax: Number(d.pax || d.NumPax || 0),
  servei: d.servei || d.Servei || '',
  comercial: d.comercial || d.Comercial || '',
  responsableName,
})

    }

    return NextResponse.json({ items: events }, { status: 200 })
  } catch (err) {
    console.error('❌ Error /api/pissarra', err)
    return NextResponse.json({ error: 'Error intern del servidor' }, { status: 500 })
  }
}
