// filename: src/hooks/useIncidents.ts
'use client'

import { useEffect, useState } from 'react'

export interface Incident {
  id: string
  createdAt: string
  department: string
  description: string
  eventId: string
  importance: string
  status: string
  createdBy?: string
  category?: { id: string; label: string }
}

// 🔵 Cache en memòria
const incidentsCache: Record<string, Incident[]> = {}

export function useIncidents(filters: {
  from?: string
  to?: string
  department?: string
  eventId?: string
  importance?: string
  categoryLabel?: string
}) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

  useEffect(() => {
    const fetchKey = JSON.stringify(filters)

    // 1) Si ja tenim cache
    if (incidentsCache[fetchKey]) {
      const raw = incidentsCache[fetchKey]
      const filtered = raw.filter((i) => {
        const byDept = !filters.department || i.department === filters.department
        const byImp =
          !filters.importance ||
          filters.importance === 'all' ||
          i.importance === filters.importance
        const byCat =
          !filters.categoryLabel || filters.categoryLabel === 'all'
            ? true
            : i.category?.label === filters.categoryLabel

        return byDept && byImp && byCat
      })
      setIncidents(filtered)
      setLoading(false)
      return
    }

    // 2) Fetch de l’API
    async function fetchIncidents() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        if (filters.eventId) params.set('eventId', filters.eventId)
        if (filters.importance && filters.importance !== 'all') {
          params.set('importance', filters.importance)
        }
        // 🔹 Categoria: no la passem al backend, es filtra al client

        const res = await fetch(`/api/incidents?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
        const data = await res.json()

        const raw = (data.incidents || []) as Incident[]
        incidentsCache[fetchKey] = raw

        const filtered = raw.filter((i) => {
          const byDept = !filters.department || i.department === filters.department
          const byImp =
            !filters.importance ||
            filters.importance === 'all' ||
            i.importance === filters.importance
          const byCat =
            !filters.categoryLabel || filters.categoryLabel === 'all'
              ? true
              : i.category?.label === filters.categoryLabel

          return byDept && byImp && byCat
        })

        setIncidents(filtered)
      } catch (err) {
        console.error('[useIncidents] Error carregant incidències:', err)
        setError('Error carregant incidències')
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [JSON.stringify(filters)])

  return { incidents, loading, error }
}
