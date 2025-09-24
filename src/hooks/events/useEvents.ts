// src/hooks/events/useEvents.ts
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

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
  scope?: 'all' | 'mine',
  includeQuadrants: boolean = false
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
        // 🔹 1. Carreguem esdeveniments (Google Calendar / API)
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
        const eventsFromPayload = (payload?.events || []) as any[]

        // 🔹 2. Carreguem quadrants (Firestore)
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
        const drafts = payloadQ?.drafts || []

        // 🔹 Helper: normalitzar codi
        const normalizeCode = (raw: string) =>
          (raw || '').replace(/^#/, '').trim().toUpperCase()

        // 🔹 Construïm mapa de quadrants (per code i per eventId)
        const quadrantMap = new Map<string, any>()
        drafts.forEach((d: any) => {
          const key = normalizeCode(d.code || d.id)
          if (key) quadrantMap.set(key, d)
          if (d.eventId) {
            quadrantMap.set(String(d.eventId), d)
          }
        })

        console.log('[useEvents] QuadrantMap keys:', Array.from(quadrantMap.keys()))

        // 🔹 3. Fem merge Calendar + Firestore
        const flat: EventData[] = eventsFromPayload.map((ev: any) => {
          // Pax
          let pax = Number(ev.pax ?? 0)
          if (!pax && ev.summary) {
            const match = ev.summary.match(/(\d{1,3}(?:[\.\s]\d{3})*|\d+)\s*pax/i)
            if (match) pax = parseInt(match[1].replace(/[^\d]/g, ''), 10)
          }

          const location = ev.location || ''
          const state: 'pending' | 'draft' | 'confirmed' =
            ev.state ?? ev.status ?? 'pending'

          // 🔹 Obtenim codi de l’event (fallback)
          let eventCode = ev.eventCode || ev.code || null

          if (!eventCode && ev.summary) {
            const cleaned = ev.summary.replace(/[#\-]/g, ' ').trim()
            const match = cleaned.match(/([A-Z]{1,3}\d{5,7})/i)
            if (match) {
              eventCode = match[1].toUpperCase()
            }
          }

          // 🔹 Fem match amb quadrant → prioritat eventId
          let q = quadrantMap.get(ev.id)
          if (!q) {
            const key = normalizeCode(eventCode || ev.id)
            q = quadrantMap.get(key)
          }

          console.log('[useEvents merge]', {
            evId: ev.id,
            summary: ev.summary,
            eventCode,
            matchedQuadrant: q?.code,
            qResponsable: q?.responsableName,
          })

          return {
            ...ev,
            pax,
            location,
            locationShort: computeLocationShort(location),
            mapsUrl: computeMapsUrl(location),
            state,
            eventCode: eventCode || q?.code || null,
            responsable: q?.responsableName || q?.responsable?.name || undefined,
            conductors: Array.isArray(q?.conductors)
              ? q.conductors.map((c: any) => c?.name).filter(Boolean)
              : [],
            treballadors: Array.isArray(q?.treballadors)
              ? q.treballadors.map((t: any) => t?.name).filter(Boolean)
              : [],
          }
        })

        // 🔹 4. Comptadors totals
        const totals: TotalPerDay = {}
        flat.forEach(ev => {
          const day = ev.start.slice(0, 10)
          totals[day] = (totals[day] || 0) + (ev.pax || 0)
        })

        // 🔹 5. Set state
        setEvents(flat)
        setTotalPerDay(totals)
        setResponsables(payload?.responsables || [])
        setResponsablesDetailed(payload?.responsablesDetailed || [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
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

  // Opcions LN (labels) derivades dels events carregats
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
