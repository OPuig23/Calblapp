// file: src/app/api/reports/modificacions/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import admin from 'firebase-admin'

type ModificationRow = {
  id: string
  eventId: string
  eventTitle: string
  eventCode: string
  eventDate: string
  eventCommercial: string
  department: string
  importance: string
  category: string
  createdAt: string
  last72h: boolean
}

function parseDate(s: any): Date | null {
  if (!s) return null
  if (typeof s === 'string') {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }
  if (s instanceof Date) return s
  if (s && typeof s.toDate === 'function') return s.toDate()
  return null
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

    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection('modifications')
      .where('eventDate', '>=', start)
      .where('eventDate', '<=', end)
      .orderBy('eventDate')

    const snap = await ref.get()

    const baseRows = snap.docs
      .map(doc => {
        const d = doc.data() as any
        const createdAt = parseDate(d.createdAt)
        return {
          id: doc.id,
          eventId: d.eventId || '',
          eventTitle: d.eventTitle || '',
          eventCode: d.eventCode || '',
          eventDate: d.eventDate || '',
          eventCommercial: d.eventCommercial || '',
          department: d.department || '',
          importance: d.importance || '',
          category: d.category?.label || d.category?.id || '',
          createdAt: createdAt ? createdAt.toISOString() : '',
          last72h: false, // es calcula després amb hora d'inici
        }
      })
      .filter(m => {
        if (
          eventFilter &&
          !m.eventCode.toLowerCase().includes(eventFilter) &&
          !m.eventTitle.toLowerCase().includes(eventFilter)
        )
          return false
        if (lineFilter) {
          // no LN guardada; no filtre real
        }
        return true
      })

    // Llegir events per obtenir hora d'inici (HoraInici/startTime) i refinar <72h
    const eventIds = Array.from(new Set(baseRows.map(r => r.eventId).filter(Boolean)))
    const eventsMap = new Map<string, any>()
    if (eventIds.length) {
      const chunks: string[][] = []
      for (let i = 0; i < eventIds.length; i += 10) chunks.push(eventIds.slice(i, i + 10))
      for (const chunk of chunks) {
        const snapEvents = await db
          .collection('stage_verd')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get()
        snapEvents.docs.forEach(doc => eventsMap.set(doc.id, doc.data()))
      }
    }

    const rows: ModificationRow[] = baseRows.map(row => {
      const ev = eventsMap.get(row.eventId || '') || {}
      const eventDateStr = row.eventDate || ev.DataInici || ev.startDate || ''
      const eventTimeStr = ev.HoraInici || ev.startTime || ''
      const eventStart = parseDate(eventTimeStr ? `${eventDateStr} ${eventTimeStr}` : eventDateStr)
      const createdAt = parseDate(row.createdAt)
      const diffH =
        createdAt && eventStart ? (eventStart.getTime() - createdAt.getTime()) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY
      const last72h = diffH >= 0 && diffH <= 72
      return {
        ...row,
        last72h,
      }
    })

    const total = rows.length
    const last72 = rows.filter(r => r.last72h).length

    const catMap = new Map<string, number>()
    const commMap = new Map<string, number>()
    const impMap = new Map<string, number>()
    rows.forEach(r => {
      const cat = r.category || 'Sense categoria'
      catMap.set(cat, (catMap.get(cat) || 0) + 1)
      const comm = r.eventCommercial || 'Sense comercial'
      commMap.set(comm, (commMap.get(comm) || 0) + 1)
      const imp = r.importance || 'sense'
      impMap.set(imp, (impMap.get(imp) || 0) + 1)
    })

    const topCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topCommercial = Array.from(commMap.entries()).sort((a, b) => b[1] - a[1])[0]

    const options = {
      events: Array.from(new Set(rows.map(r => r.eventCode || r.eventId).filter(Boolean))).map(code => ({
        id: code,
        name: code,
      })),
      lines: [], // no LN disponible
      departments: Array.from(new Set(rows.map(r => r.department).filter(Boolean))).sort(),
      categories: Array.from(catMap.keys()).sort(),
      commercials: Array.from(commMap.keys()).sort(),
      importances: Array.from(impMap.keys()).sort(),
    }

    return NextResponse.json({
      success: true,
      data: rows,
      summary: {
        total,
        last72,
        topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
        topCommercial: topCommercial ? { name: topCommercial[0], count: topCommercial[1] } : null,
      },
      options,
    })
  } catch (e) {
    console.error('[reports/modificacions] error:', e)
    const msg = e instanceof Error ? e.message : 'Error intern'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
