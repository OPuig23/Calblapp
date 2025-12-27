// file: src/app/api/reports/events/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const isIndexError = (err: any) =>
  err?.code === 9 || String(err?.message || '').toLowerCase().includes('requires an index')

type EventRow = {
  id: string
  name: string
  ln: string
  pax: number
  location: string
  commercial: string
  serviceType: string
}

async function listQuadrantCollections() {
  const cols = await db.listCollections()
  return cols.map(c => c.id).filter(id => id.toLowerCase().startsWith('quadrants'))
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const eventFilter = (searchParams.get('event') || '').trim().toLowerCase()
    const lineFilter = (searchParams.get('line') || '').trim().toLowerCase()
    if (!start || !end) {
      return NextResponse.json({ success: false, error: 'Falten start/end (YYYY-MM-DD)' }, { status: 400 })
    }

    const colNames = await listQuadrantCollections()

    const warnings: string[] = []
    const events = new Map<string, EventRow>()
    const lines = new Set<string>()
    const commercials = new Set<string>()

    for (const colName of colNames) {
      const ref = db.collection(colName)
      let snap
      try {
        snap = await ref.where('startDate', '<=', end).where('endDate', '>=', start).get()
      } catch (err: any) {
        if (isIndexError(err)) {
          const msg = String(err?.message || '')
          const link = msg.match(/https?:\/\/\S+/)?.[0]
          warnings.push(
            `Falta un index startDate/endDate per a la col·leccio ${colName}. ${
              link ? `Crea'l o revisa'l: ${link}` : 'Revisa la consola de Firestore.'
            }`
          )
          continue
        }
        throw err
      }

      if (snap.empty) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        try {
          snap = await ref.where('startDate', '<=', endDate).where('endDate', '>=', startDate).get()
        } catch (err: any) {
          if (isIndexError(err)) {
            const msg = String(err?.message || '')
            const link = msg.match(/https?:\/\/\S+/)?.[0]
            warnings.push(
              `Falta un index startDate/endDate per a la col·leccio ${colName}. ${
                link ? `Crea'l o revisa'l: ${link}` : 'Revisa la consola de Firestore.'
              }`
            )
            continue
          }
          throw err
        }
      }

      if (snap.empty) continue

      snap.forEach(doc => {
        const d = doc.data() as any
        const eventId = d.code || d.eventCode || d.eventId || doc.id
        const name = d.eventName || d.name || d.title || d.summary || ''
        const ln = (d.LN || d.ln || d.line || d.lineaNegoci || '').toString()
        const pax = Number(d.pax || d.assistents || d.numPersones || d.totalPax || 0)
        const location = d.location || d.place || d.address || d.Ubicacio || ''
        const commercial =
          d.comercial?.name ||
          d.comercial ||
          d.commercial ||
          d.sales ||
          (typeof d.comercial === 'object' ? d.comercial?.id || d.comercial?.email : '') ||
          ''
        const serviceType = d.Servei || d.serviceType || ''

        const eventKey = String(eventId || name || doc.id)
        if (!eventKey) return

        if (lineFilter && ln.toLowerCase() !== lineFilter) return
        if (
          eventFilter &&
          !String(eventKey).toLowerCase().includes(eventFilter) &&
          !String(name).toLowerCase().includes(eventFilter)
        )
          return

        if (ln) lines.add(ln)
        if (commercial) commercials.add(String(commercial))

        if (events.has(eventKey)) return
        events.set(eventKey, {
          id: eventKey,
          name: name || eventKey,
          ln,
          pax: Number.isFinite(pax) ? pax : 0,
          location,
          commercial,
          serviceType,
        })
      })
    }

    const data = Array.from(events.values())

    return NextResponse.json({
      success: true,
      data,
      options: {
        events: data.map(ev => ({ id: ev.id, name: ev.name })),
        lines: Array.from(lines).sort(),
        commercials: Array.from(commercials).sort(),
      },
      warnings,
    })
  } catch (e: unknown) {
    console.error('[reports/events] error:', e)
    const msg = e instanceof Error ? e.message : 'Error intern'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
