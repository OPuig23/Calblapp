// filename: src/app/api/pissarra/cuina/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

type QuadrantDoc = {
  code?: string
  eventName?: string
  startDate?: string
  startTime?: string
  location?: string
  service?: string
  numPax?: number
  pax?: number
  status?: string
  conductors?: Array<{ name?: string }>
  treballadors?: Array<{ name?: string }>
  groups?: Array<{
    meetingPoint?: string
    startTime?: string
    workers?: number
    drivers?: number
    responsibleName?: string | null
  }>
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

    const col = db.collection('quadrantsCuina')
    let snap
    try {
      snap = await col
        .where('startDate', '>=', start)
        .where('startDate', '<=', end)
        .get()
    } catch (e) {
      console.warn('[pissarra/cuina] fallback full scan', e)
      snap = await col.get()
    }

    const items = await Promise.all(snap.docs.map(async (doc) => {
      const d = doc.data() as QuadrantDoc
      const st = norm(d.status)
      if (st && st !== 'confirmed' && st !== 'draft') return null

      const startDate = d.startDate || ''
      if (!startDate || startDate < start || startDate > end) return null

      const groups = Array.isArray(d.groups) ? d.groups : []
      const group1 = groups[0]
      const group2 = groups[1]

      const conductors = Array.isArray(d.conductors)
        ? d.conductors.map((c) => c?.name || '').filter(Boolean)
        : []
      const treballadors = Array.isArray(d.treballadors)
        ? d.treballadors.map((t) => t?.name || '').filter(Boolean)
        : []

      let driverIdx = 0
      let workerIdx = 0

      const buildGroup = (group?: QuadrantDoc['groups'][number]) => {
        if (!group) return null
        const driversTotal = Number(group.drivers || 0)
        const workersTotal = Number(group.workers || 0)
        const responsibleName = group.responsibleName || null

        const driverNames = conductors.slice(driverIdx, driverIdx + driversTotal)
        driverIdx += driversTotal

        const responsibleIsDriver =
          !!responsibleName &&
          driverNames.some((n) => norm(n) === norm(responsibleName))
        const workersNeeded = Math.max(
          workersTotal - driversTotal - (responsibleIsDriver ? 0 : 1),
          0
        )
        const workerNames = treballadors.slice(workerIdx, workerIdx + workersNeeded)
        workerIdx += workersNeeded

        return {
          responsibleName,
          drivers: driverNames.length ? driverNames : driversTotal ? ['Extra'] : [],
          workers: workerNames.length ? workerNames : workersNeeded ? ['Extra'] : [],
          meetingPoint: group.meetingPoint || '',
          startTime: group.startTime || '',
        }
      }

      const g1 = buildGroup(group1)
      const g2 = buildGroup(group2)

      let pax = Number(d.numPax || d.NumPax || d.pax || 0)
      if (!pax && d.code) {
        try {
          const evSnap = await db
            .collection('stage_verd')
            .where('code', '==', d.code)
            .limit(1)
            .get()
          if (!evSnap.empty) {
            const ev = evSnap.docs[0].data() as any
            pax = Number(ev?.NumPax || ev?.numPax || ev?.pax || 0)
          }
        } catch (err) {
          console.warn('[pissarra/cuina] pax fallback error', err)
        }
      }

      return {
        id: doc.id,
        code: d.code || '',
        LN: 'cuina',
        eventName: d.eventName || '',
        startDate,
        startTime: d.startTime || '',
        location: d.location || '',
        pax,
        servei: d.service || '',
        group1Responsible: g1?.responsibleName || null,
        group1Drivers: g1?.drivers || [],
        group1Workers: g1?.workers || [],
        group1MeetingPoint: g1?.meetingPoint || '',
        group1StartTime: g1?.startTime || '',
        group2Responsible: g2?.responsibleName || null,
        group2Drivers: g2?.drivers || [],
        group2Workers: g2?.workers || [],
        group2MeetingPoint: g2?.meetingPoint || '',
        group2StartTime: g2?.startTime || '',
      }
    }))

    return NextResponse.json({ items: items.filter(Boolean) }, { status: 200 })
  } catch (err) {
    console.error('[api/pissarra/cuina] error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
