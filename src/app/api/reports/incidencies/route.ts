// file: src/app/api/reports/incidencies/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

type IncidentRow = {
  id: string
  eventId: string
  eventTitle: string
  eventCode: string
  department: string
  importance: string
  category: string
  status: string
  ln: string
  createdAt: string
  eventDate: string
}

function normalizeTimestamp(ts: any): string {
  if (ts && typeof ts.toDate === 'function') return ts.toDate().toISOString().slice(0, 10)
  if (typeof ts === 'string') return ts
  return ''
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

    let ref = db.collection('incidents').orderBy('eventDate')
    ref = ref.where('eventDate', '>=', start).where('eventDate', '<=', end)

    const snap = await ref.get()

    const incidents: IncidentRow[] = snap.docs
      .map(doc => {
        const d = doc.data() as any
        return {
          id: doc.id,
          eventId: String(d.eventId || ''),
          eventTitle: d.eventTitle || '',
          eventCode: d.eventCode || '',
          department: d.department || '',
          importance: d.importance || '',
          category: d.category?.label || d.category?.id || '',
          status: d.status || '',
          ln: d.ln || '',
          createdAt: normalizeTimestamp(d.createdAt),
          eventDate: d.eventDate || '',
        }
      })
      .filter(inc => {
        if (lineFilter && inc.ln.toLowerCase() !== lineFilter) return false
        if (
          eventFilter &&
          !inc.eventCode.toLowerCase().includes(eventFilter) &&
          !inc.eventTitle.toLowerCase().includes(eventFilter)
        )
          return false
        return true
      })

    const total = incidents.length
    const open = incidents.filter(i => (i.status || '').toLowerCase() === 'obert').length

    const catMap = new Map<string, number>()
    const deptMap = new Map<string, number>()
    const eventMap = new Map<string, { title: string; count: number }>()
    incidents.forEach(i => {
      const cat = i.category || 'Sense categoria'
      catMap.set(cat, (catMap.get(cat) || 0) + 1)
      const dep = i.department || 'Sense departament'
      deptMap.set(dep, (deptMap.get(dep) || 0) + 1)
      const key = i.eventId || i.eventTitle || i.eventCode
      if (key) {
        const current = eventMap.get(key) || { title: i.eventTitle || i.eventCode || key, count: 0 }
        current.count += 1
        eventMap.set(key, current)
      }
    })

    const topCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topEvent = Array.from(eventMap.entries()).sort((a, b) => b[1].count - a[1].count)[0]

    const options = {
      events: Array.from(eventMap.entries()).map(([id, obj]) => ({ id, name: obj.title })),
      lines: Array.from(new Set(incidents.map(i => i.ln).filter(Boolean))).sort(),
      departments: Array.from(new Set(incidents.map(i => i.department).filter(Boolean))).sort(),
      categories: Array.from(catMap.keys()).sort(),
    }

    return NextResponse.json({
      success: true,
      data: incidents,
      summary: {
        total,
        open,
        topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
        topEvent: topEvent ? { name: topEvent[1].title, count: topEvent[1].count } : null,
      },
      options,
    })
  } catch (e) {
    console.error('[reports/incidencies] error:', e)
    const msg = e instanceof Error ? e.message : 'Error intern'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
