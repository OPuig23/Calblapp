//filename: src/hooks/usePissarra.ts
'use client'

import { useEffect, useMemo, useState } from 'react'

export interface PissarraItem {
  id: string
  code: string
  LN?: string
  eventName?: string
  startDate?: string
  startTime?: string
  location?: string
  pax?: number
  servei?: string
  comercial?: string
  responsableName?: string
  HoraInici?: string   // ← afegim el camp opcional
  horaInici?: string
}

export default function usePissarra(weekStart: string, weekEnd: string, role?: string, department?: string) {
  const [flat, setFlat] = useState<PissarraItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const canEdit = role === 'admin' || department === 'produccio'

  useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`/api/pissarra?start=${weekStart}&end=${weekEnd}`, { cache: 'no-store' })
        const data = await res.json()
        if (active) setFlat(data.items || [])
      } catch (err: any) {
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [weekStart, weekEnd])

  const dataByDay = useMemo(() => {
    const grouped: Record<string, PissarraItem[]> = {}
    flat.forEach((ev) => {
      const day = ev.startDate || 'sense-data'
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(ev)
    })
    return grouped
  }, [flat])

  async function updateField(id: string, payload: Partial<PissarraItem>) {
    await fetch('/api/pissarra/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payload }),
    })
    setFlat((prev) => prev.map((e) => (e.id === id ? { ...e, ...payload } : e)))
  }

  return { dataByDay, flat, loading, error, canEdit, updateField }
}
