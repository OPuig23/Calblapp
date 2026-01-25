import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')

    if (!start || !end) {
      return NextResponse.json({ error: 'Falten start i end' }, { status: 400 })
    }

    // Llegim totes les colleccions del Firestore
    const collections = ['stage_verd', 'stage_taronja']
    const base: Record<string, unknown>[] = []

    for (const coll of collections) {
      console.log(`[events/calendar] Llegint Firestore: ${coll}`)
      const snap = await db.collection(coll).get()

      snap.forEach((doc) => {
        const d = doc.data() as FirebaseFirestore.DocumentData

        const startISO =
          typeof d.DataInici === 'string'
            ? `${d.DataInici}T12:00:00`
            : null

        const endISO =
          typeof d.DataFi === 'string'
            ? `${d.DataFi}T12:00:00`
            : startISO

        const rawSummary =
          typeof d.NomEvent === 'string' ? d.NomEvent : '(Sense titol)'

        const summary = rawSummary.split('/')[0].trim()

        const location = (d.Ubicacio ?? '')
          .split('(')[0]
          .split('/')[0]
          .replace(/^ZZ\s*/i, '')
          .trim()

        const lnValue = typeof d.LN === 'string' ? d.LN : 'Altres'

        // Extreure tots els fileN del document
        const fileFields: Record<string, string> = {}
        Object.entries(d).forEach(([k, v]) => {
          if (
            k.toLowerCase().startsWith('file') &&
            typeof v === 'string' &&
            v.length > 0
          ) {
            fileFields[k] = v
          }
        })

        base.push({
          id: doc.id,
          ...fileFields,

          // Camps normalitzats
          summary,
          start: startISO,
          end: endISO,
          day: d.DataInici || '',

          location,
          lnKey: lnValue.toLowerCase(),
          lnLabel: lnValue,
          collection: coll,

          code: d.code || d.Code || d.codi || '',
          codeConfirmed:
            typeof d.codeConfirmed === 'boolean' ? d.codeConfirmed : undefined,
          codeMatchScore:
            typeof d.codeMatchScore === 'number' ? d.codeMatchScore : undefined,

          comercial: d.Comercial || d.comercial || '',
          servei: d.Servei || d.servei || '',

          // FIX: Pax robust
          numPax:
            d.NumPax ??
            d.numPax ??
            d.PAX ??
            null,

          // FIX: Observacions Zoho
          ObservacionsZoho:
            d.ObservacionsZoho ??
            d.observacionsZoho ??
            d.Observacions ??
            d.observacions ??
            '',

          stageGroup: d.StageGroup || d.stageGroup || '',
          HoraInici: d.HoraInici || d.horaInici || '',
        })
      })
    }

    console.log(`[events/calendar] Total esdeveniments trobats: ${base.length}`)

    return NextResponse.json({ events: base }, { status: 200 })
  } catch (err) {
    console.error('[api/events/calendar] Error:', err)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
