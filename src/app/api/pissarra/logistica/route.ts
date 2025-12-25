// filename: src/app/api/pissarra/logistica/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

type QuadrantDoc = {
  code?: string
  eventName?: string
  startDate?: string
  startTime?: string
  arrivalTime?: string
  location?: string
  status?: string
  conductors?: Array<{ plate?: string; vehicleType?: string; name?: string }>
  treballadors?: Array<{ name?: string }>
}

const norm = (v?: string | null) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end' }, { status: 400 })
    }

    const collections = ['quadrantsLogistica', 'quadrantsCuina']
    const map = new Map<string, any>()

    for (const colName of collections) {
      const col = db.collection(colName)
      let snap
      try {
        snap = await col
          .where('startDate', '>=', start)
          .where('startDate', '<=', end)
          .get()
      } catch (e) {
        console.warn(`[pissarra/logistica] fallback full scan ${colName}`, e)
        snap = await col.get()
      }

      snap.forEach((doc) => {
        const d = doc.data() as QuadrantDoc
        const st = norm(d.status)
        if (st && st !== 'confirmed' && st !== 'draft') return

        const startDate = d.startDate || ''
        if (!startDate || startDate < start || startDate > end) return

        const vehicles = Array.isArray(d.conductors)
          ? d.conductors.map((c) => ({
              plate: c?.plate || '',
              type: c?.vehicleType || '',
              conductor: c?.name || '',
              source: colName, // logistica | cuina
            }))
          : []

        const workers = Array.isArray(d.treballadors)
          ? d.treballadors.map((t) => t?.name || '').filter(Boolean)
          : []

        const existing = map.get(doc.id) || {
          id: doc.id,
          code: d.code || '',
          LN: 'logistica',
          eventName: d.eventName || '',
          startDate,
          startTime: d.startTime || '',
          arrivalTime: d.arrivalTime || '',
          location: d.location || '',
          vehicles: [] as any[],
          workers: [] as string[],
        }

        existing.vehicles = [...(existing.vehicles || []), ...vehicles]
        existing.workers = [...(existing.workers || []), ...workers]
        // Prioritza arrivalTime si ve ple d'alguna col·lecció
        if (!existing.arrivalTime && d.arrivalTime) existing.arrivalTime = d.arrivalTime

        map.set(doc.id, existing)
      })
    }

    return NextResponse.json({ items: Array.from(map.values()) }, { status: 200 })
  } catch (err) {
    console.error('[api/pissarra/logistica] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
