// ✅ file: src/hooks/useLogisticsData.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { getWeek, startOfWeek, addWeeks, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'

interface LogisticsEvent {
  id: string
  NomEvent: string
  Ubicacio: string
  NumPax?: number
  DataInici: string
  DataVisual?: string
  HoraInici?: string
  PreparacioData?: string
  PreparacioHora?: string
}

/**
 * Hook per carregar esdeveniments.
 * - Si reps dateRange (start/end), filtra per aquest rang
 * - Si no, usa offset (setmana actual + offset)
 */
export function useLogisticsData(dateRange?: { start: string; end: string } | null) {
  const { data: session } = useSession()
  const role = (session?.user?.role || '').toLowerCase()

  const [events, setEvents] = useState<LogisticsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // 🔹 Construeix la URL segons tinguem rang o no
      const url = dateRange?.start && dateRange?.end
        ? `/api/logistics?start=${dateRange.start}&end=${dateRange.end}`
        : `/api/logistics?offset=${weekOffset}`

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        console.error('❌ Error API logistics:', await res.text())
        setEvents([])
        return
      }

      const { ok, events: data } = (await res.json()) as {
        ok: boolean
        events: LogisticsEvent[]
      }
      if (!ok || !data) { setEvents([]); return }

      const visible =
        role === 'treballador'
          ? data.filter(e => e.PreparacioData && e.PreparacioHora)
          : data

      setEvents(visible)
    } catch (err) {
      console.error('❌ Error carregant dades logístiques:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [role, weekOffset, dateRange?.start, dateRange?.end])

  useEffect(() => { loadData() }, [loadData])

  // 🔹 Setmana actual mostrada (si hi ha rang, la calculem des del seu inici)
  const weekBase = dateRange?.start
    ? startOfWeek(parseISO(dateRange.start), { weekStartsOn: 1 })
    : startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const currentWeek = getWeek(weekBase, { weekStartsOn: 1 })

  return { events, loading, refresh: loadData, weekOffset, setWeekOffset, currentWeek }
}
