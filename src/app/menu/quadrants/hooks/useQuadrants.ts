// src/app/menu/quadrants/hooks/useQuadrants.ts
import { useEffect, useState, useCallback } from 'react'

export type Quadrant = {
  id: string
  department: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  status: 'draft' | 'confirmed'
  eventName?: string
  code?: string
  location?: string
  [key: string]: unknown
}

export function useQuadrants(
  department: string,
  start?: string,
  end?: string,
  status: 'all' | 'confirmed' | 'draft' = 'all'
) {
  const [quadrants, setQuadrants] = useState<Quadrant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (department) params.set('department', department)
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      if (status) params.set('status', status)

      const url = `/api/quadrants/list?${params.toString()}`
      console.log('[useQuadrants] Fetch URL=', url)

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setQuadrants(json.drafts ?? json.quadrants ?? [])
    } catch (e: unknown) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [department, start, end, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { quadrants, loading, error, reload: fetchData }
}
