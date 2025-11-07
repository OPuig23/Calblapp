// file: src/hooks/events/useEvents.ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { normalizeStatus } from '@/utils/normalize'

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
  LN?: string               // 🟢 Afegit per compatibilitat Firestore
  lnKey?: string            // 🟢 Afegit per compatibilitat futura
  lnLabel?: string    
  [key: string]: unknown

}

interface QuadrantDraft {
  id: string
  code?: string
  eventId?: string | number
  responsableName?: string
  responsable?: { name?: string }
  conductors?: { name?: string }[]
  treballadors?: { name?: string }[]
  [key: string]: unknown
}

type GroupedEvents = Record<string, EventData[]>
type TotalPerDay = Record<string, number>

const computeLocationShort = (full = '') => {
  if (!full) return ''
  const cut = full.split(/[,\|\.]/)[0]?.trim() || full.trim()
  return cut.length > 30 ? cut.slice(0, 30) + '…' : cut
}

const computeMapsUrl = (location = '') =>
  location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : undefined

export interface ResponsableDetailed {
  name: string
  department: string
}

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [responsablesDetailed, setResponsablesDetailed] = useState<ResponsableDetailed[]>([])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!fromISO || !toISO || !department) return
      setLoading(true)
      setError(null)

      try {
        // 🔹 1. Carreguem esdeveniments
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

        // 🔹 2. Carreguem quadrants
        const qsQ = new URLSearchParams({
          start: fromISO.slice(0, 10),
          end: toISO.slice(0, 10),
          department,
        })
        const resQ = await fetch(`/api/quadrants/list?${qsQ.toString()}`, {
          cache: 'no-store',
          signal,
        })
        const payloadQ = await resQ.json()
        const drafts: QuadrantDraft[] = payloadQ?.drafts || []

        const normalizeCode = (raw: string) =>
          (raw || '').replace(/^#/, '').trim().toUpperCase()

        const quadrantMap = new Map<string, QuadrantDraft>()
        drafts.forEach((d) => {
          const key = normalizeCode(d.code || d.id)
          if (key) quadrantMap.set(key, d)
          if (d.eventId) quadrantMap.set(String(d.eventId), d)
        })

// 🔹 3. Merge Calendar + Firestore
const flat = eventsFromPayload.map((ev) => {
  let pax = Number(ev.pax ?? 0)
  if ((!pax || Number.isNaN(pax)) && ev.summary) {
    const match = ev.summary.match(/(\d{1,4})\s*(pax|persones?|comensals?)/i)
    if (match) pax = parseInt(match[1].replace(/[^\d]/g, ''), 10)
  }

  const location = ev.location || ''
  let eventCode = ev.eventCode || ev.code || null
  if (!eventCode && ev.summary) {
    const cleaned = ev.summary.replace(/[#\-]/g, ' ').trim()
    const match = cleaned.match(/([A-Z]{1,3}\d{5,7})/i)
    if (match) eventCode = match[1].toUpperCase()
  }

  let q = quadrantMap.get(ev.id)
  if (!q) {
    const key = normalizeCode(eventCode || ev.id)
    q = quadrantMap.get(key)
  }

  const state = normalizeStatus(
    (q?.status as string) ||
    (ev.state as string) ||
    (ev.status as string)
  )

  // 🟢 Afegim LN (línia de negoci)
  const lnKey = (ev.LN || ev.lnKey || '').toLowerCase() || 'altres'
  const lnLabel = ev.LN || ev.lnLabel || 'Altres'

  return {
    ...ev,
    pax,
    location,
    day: ev.start.slice(0, 10),
    locationShort: computeLocationShort(location),
    mapsUrl: computeMapsUrl(location),
    state,
    eventCode: eventCode || q?.code || null,
    responsable: q?.responsableName || q?.responsable?.name || undefined,
    conductors: Array.isArray(q?.conductors)
      ? q.conductors.map((c) => c?.name).filter(Boolean) as string[]
      : [],
    treballadors: Array.isArray(q?.treballadors)
      ? q.treballadors.map((t) => t?.name).filter(Boolean) as string[]
      : [],
    lnKey,
    lnLabel,
  }
}) as EventData[]



               // 🔹 4. Comptadors totals
        const totals: TotalPerDay = {}
        flat.forEach(ev => {
          const day = ev.start.slice(0, 10)
          totals[day] = (totals[day] || 0) + (ev.pax || 0)
        })

        // 🔹 5. Agrupem per dia
        const grouped: GroupedEvents = {}
        flat.forEach(ev => {
          if (!grouped[ev.day]) grouped[ev.day] = []
          grouped[ev.day].push(ev)
        })

        // 🔹 6. Set state
        setEvents(flat)
        setTotalPerDay(totals)
        setGroupedEvents(grouped)
        setResponsables(payload?.responsables || [])
        setResponsablesDetailed(payload?.responsablesDetailed || [])
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Error carregant esdeveniments')
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
    events.forEach(e => {
      if (e.lnLabel) set.add(e.lnLabel)
    })
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
