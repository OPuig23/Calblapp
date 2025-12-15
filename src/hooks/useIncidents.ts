'use client'

import { useEffect, useState, useMemo } from 'react'

export interface Incident {
  id: string
  createdAt: string
  department: string
  description: string
  eventId: string
  eventTitle?: string
  eventCode?: string
  eventLocation?: string
  eventDate?: string
  importance: string
  status: string
  createdBy?: string
  category?: { id: string; label: string }
  ln?: string
  pax?: number
  serviceType?: string
  fincaId?: string
}

export function useIncidents(_filters: {
  eventId?: string
  from?: string
  to?: string
  department?: string
  importance?: string
  categoryLabel?: string
}) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🧠 IMPORTANT — Filtre memoitzat
  const filters = useMemo(
    () => ({
      eventId: _filters.eventId,
      from: _filters.from,
      to: _filters.to,
      department: _filters.department,
      importance: _filters.importance,
      categoryLabel: _filters.categoryLabel,
    }),
    [
      _filters.eventId,
      _filters.from,
      _filters.to,
      _filters.department,
      _filters.importance,
      _filters.categoryLabel,
    ]
  )

  useEffect(() => {
    let cancel = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const qs = new URLSearchParams()

        // 🔑 FILTRE CLAU PER ESDEVENIMENT
        if (filters.eventId) qs.set('eventId', filters.eventId)

        if (filters.from) qs.set('from', filters.from)
        if (filters.to) qs.set('to', filters.to)
        if (filters.department) qs.set('department', filters.department)
        if (filters.importance && filters.importance !== 'all')
          qs.set('importance', filters.importance)
        if (filters.categoryLabel && filters.categoryLabel !== 'all')
          qs.set('categoryId', filters.categoryLabel)

        const res = await fetch(`/api/incidents?${qs.toString()}`, {
          cache: 'no-store',
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()

        const raw = Array.isArray(data.incidents)
          ? data.incidents
          : Array.isArray(data)
          ? data
          : []

        if (!cancel) setIncidents(raw as Incident[])
      } catch (err: any) {
        if (!cancel) setError(err.message || 'Error carregant incidències')
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    load()
    return () => {
      cancel = true
    }
  }, [
    filters.eventId,
    filters.from,
    filters.to,
    filters.department,
    filters.importance,
    filters.categoryLabel,
  ])

  const updateIncident = async (id: string, data: Partial<Incident>) => {
    await fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  }

  return { incidents, loading, error, updateIncident }
}
