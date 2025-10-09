//filename: src/hooks/useModifications.ts
'use client'

import { useEffect, useMemo, useState } from 'react'

export interface Modification {
  id: string
  eventId: string
  eventCode?: string
  eventTitle?: string
  eventDate?: string
  department: string
  createdBy: string
  tipus?: string
  category?: { id: string; label: string }
  importance: string
  description: string
  createdAt: string
}

// 🔵 Cache en memòria (igual que useIncidents)
const modificationsCache: Record<string, Modification[]> = {}

export function useModifications(filters: {
  from?: string
  to?: string
  department?: string
  eventId?: string
  importance?: string
  categoryId?: string
}) {
  const [modifications, setModifications] = useState<Modification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

  // ✅ clau estable per la cache
  const fetchKey = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    async function fetchModifications() {
      try {
        setLoading(true)
        setError(null)

        // 1️⃣ Revisar cache
        if (modificationsCache[fetchKey]) {
          const cached = modificationsCache[fetchKey]
          setModifications(cached)
          setLoading(false)
          return
        }

        // 2️⃣ Construir query string
        const params = new URLSearchParams()
        if (filters.from) params.set('from', filters.from)
        if (filters.to) params.set('to', filters.to)
        if (filters.eventId) params.set('eventId', filters.eventId)
        if (filters.department) params.set('department', filters.department)
        if (filters.importance && filters.importance !== 'all')
          params.set('importance', filters.importance)
        if (filters.categoryId && filters.categoryId !== 'all')
          params.set('categoryId', filters.categoryId)

        // 3️⃣ Crida API
        const res = await fetch(`/api/modifications?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
        const data = await res.json()

        const mods = (data.modifications || []) as Modification[]
        modificationsCache[fetchKey] = mods
        setModifications(mods)
      } catch (err) {
        console.error('[useModifications] Error carregant modificacions:', err)
        setError('Error carregant registres de modificacions')
      } finally {
        setLoading(false)
      }
    }

    fetchModifications()
  }, [fetchKey]) // 👈 només aquesta dependència

  return { modifications, loading, error }
}
