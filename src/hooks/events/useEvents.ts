//file: src/hooks/events/useEvents.ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { normalizeStatus } from '@/utils/normalize'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'

/* ───────────────────────── TIPUS ───────────────────────── */

export interface EventData {
  id: string
  summary: string
  start: string
  end: string | null
  day: string
  location: string
  pax: number
  state: 'pending' | 'draft' | 'confirmed'
  name: string
  eventCode: string | null
  commercial?: string
  locationShort?: string
  mapsUrl?: string
  htmlLink?: string | null
  responsableName?: string
  lnKey?: 'empresa' | 'casaments' | 'foodlovers' | 'agenda' | 'altres'
  lnLabel?: string
  isResponsible?: boolean
  responsable?: string
  conductors?: string[]
  treballadors?: string[]

  // 🆕 Últim avís de producció
  lastAviso?: {
    content: string
    department: string
    createdAt: string
  } | null
}

interface EventPayload {
  id: string
  summary: string
  start: string
  end?: string
  location?: string
  pax?: number
  state?: string
  status?: string
  eventCode?: string
  code?: string
  responsableName?: string
  responsable?: { name?: string }
  LN?: string
  lnKey?: string
  lnLabel?: string
  [key: string]: unknown
}

interface QuadrantDraft {
  id: string
  code?: string
  eventId?: string | number
  status?: string
  responsableName?: string
  responsable?: { name?: string }
  conductors?: { name?: string }[]
  treballadors?: { name?: string }[]
  [key: string]: unknown
}

type GroupedEvents = Record<string, EventData[]>
type TotalPerDay = Record<string, number>

export interface ResponsableDetailed {
  name: string
  department: string
}

/* ───────────────────────── HELPERS ───────────────────────── */

const computeLocationShort = (full = '') => {
  if (!full) return ''
  const cut = full.split(/[,\|\.]/)[0]?.trim() || full.trim()
  return cut.length > 30 ? cut.slice(0, 30) + '…' : cut
}

const computeMapsUrl = (location = '') =>
  location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : undefined

const normalizeCode = (raw?: string | number | null) =>
  String(raw ?? '').replace(/^#/, '').trim().toUpperCase()

/* ───────────────────────── HOOK ───────────────────────── */

export default function useEvents(
  department: string,
  fromISO: string,
  toISO: string,
  scope?: 'all' | 'mine'
) {
  const [events, setEvents] = useState<EventData[]>([])
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents>({})
  const [totalPerDay, setTotalPerDay] = useState<TotalPerDay>({})
  const [responsables, setResponsables] = useState<string[]>([])
  const [responsablesDetailed, setResponsablesDetailed] = useState<ResponsableDetailed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!fromISO || !toISO || !department) return

      setLoading(true)
      setError(null)

      try {
        /* ───── 1. EVENTS ───── */
        const qs = new URLSearchParams({
          start: fromISO.slice(0, 10),
          end: toISO.slice(0, 10),
          department,
        })
        if (scope) qs.set('scope', scope)

        const res = await fetch(`/api/events/list?${qs.toString()}`, {
          cache: 'no-store',
          signal,
        })
        const payload = await res.json()
        const eventsFromPayload = (payload?.events || []) as EventPayload[]

        /* ───── 2. QUADRANTS ───── */
        const resQ = await fetch(
          `/api/quadrants/list?${qs.toString()}`,
          { cache: 'no-store', signal }
        )
        const payloadQ = await resQ.json()
        const drafts: QuadrantDraft[] = payloadQ?.drafts || []

        const quadrantMap = new Map<string, QuadrantDraft>()
        drafts.forEach((d) => {
          if (d.code) quadrantMap.set(normalizeCode(d.code), d)
          if (d.eventId) quadrantMap.set(String(d.eventId), d)
        })

        /* ───── 3. AVISOS (últim per codi) ───── */
        const avisosSnap = await getDocs(
          query(collection(db, 'avisos'), orderBy('createdAt', 'desc'))
        )

        const avisosByCode = new Map<
          string,
          { content: string; department: string; createdAt: string }
        >()

        avisosSnap.forEach((doc) => {
          const d = doc.data()
          if (!d.code) return
          if (!avisosByCode.has(d.code)) {
            avisosByCode.set(d.code, {
              content: d.content,
              department: d.department,
              createdAt: d.createdAt?.toDate
                ? d.createdAt.toDate().toISOString()
                : d.createdAt,
            })
          }
        })

        /* ───── 4. MERGE FINAL ───── */
        const flat: EventData[] = eventsFromPayload.map((ev) => {
          const location = ev.location || ''

          // 🔑 BUSQUEM QUADRANT
          let q =
            quadrantMap.get(String(ev.id)) ||
            quadrantMap.get(normalizeCode(ev.eventCode || ev.code))

          // 🔑 EVENT CODE (ordre clar)
          let eventCode =
            ev.eventCode ||
            q?.code ||
            ev.code ||
            null

          if (!eventCode && ev.summary) {
            const m = ev.summary.match(/([A-Z]{1,3}\d{5,7})/i)
            if (m) eventCode = m[1].toUpperCase()
          }

          const lastAviso = eventCode
            ? avisosByCode.get(eventCode) ?? null
            : null

          const pax = Number(ev.pax ?? 0)

          return {
            ...(ev as any),

            pax,
            location,
            day: ev.start.slice(0, 10),
            locationShort: computeLocationShort(location),
            mapsUrl: computeMapsUrl(location),

            state: normalizeStatus(q?.status || ev.state || ev.status),
            eventCode,
            lastAviso,

            responsable: q?.responsableName || q?.responsable?.name,
            responsableName: q?.responsableName || q?.responsable?.name || '',

            conductors: q?.conductors?.map(c => c.name).filter(Boolean) || [],
            treballadors: q?.treballadors?.map(t => t.name).filter(Boolean) || [],

            lnKey: String((ev as any).LN || (ev as any).lnKey || 'altres').toLowerCase() as any,
            lnLabel: String((ev as any).LN || (ev as any).lnLabel || 'Altres'),

            fincaId: (ev as any).fincaId ?? null,
            fincaCode: (ev as any).fincaCode ?? null,
          }
        })

        /* ───── 5. TOTALS I GRUPS ───── */
        const totals: TotalPerDay = {}
        const grouped: GroupedEvents = {}

        flat.forEach((ev) => {
          totals[ev.day] = (totals[ev.day] || 0) + (ev.pax || 0)
          if (!grouped[ev.day]) grouped[ev.day] = []
          grouped[ev.day].push(ev)
        })

        /* ───── 6. STATE ───── */
        setEvents(flat)
        setTotalPerDay(totals)
        setGroupedEvents(grouped)
        setResponsables(payload?.responsables || [])
        setResponsablesDetailed(payload?.responsablesDetailed || [])
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message || 'Error carregant esdeveniments')
        }
      } finally {
        setLoading(false)
      }
    },
    [fromISO, toISO, scope, department]
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const lnOptions = useMemo(() => {
    const set = new Set<string>()
    events.forEach(e => e.lnLabel && set.add(e.lnLabel))
    const order = ['Empresa', 'Casaments', 'Foodlovers', 'Agenda', 'Altres']
    return Array.from(set).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  }, [events])

  return {
    events,
    loading,
    error,
    groupedEvents,
    totalPerDay,
    responsables,
    responsablesDetailed,
    lnOptions,
  }
}
