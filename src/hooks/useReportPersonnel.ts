// src/hooks/useReportPersonnel.ts
import { useState, useEffect } from 'react'
import type { ReportFilters } from '@/services/reports'

export function useReportPersonnel(filters: ReportFilters) {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string|null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      type:         'personnel',
      department:   filters.department,
      role:         filters.role,
      from:         filters.from,
      to:           filters.to,
      event:        filters.event,
      responsible:  filters.responsible,
      businessLine: filters.businessLine
    })
    fetch('/api/reports?' + params.toString())
      .then(async res => {
        const payload = await res.json()
        console.log("[useEvents] payload rebut:", payload)

        if (!res.ok) throw new Error(payload.error || res.statusText)
        return payload
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [JSON.stringify(filters)])

  return { data, loading, error }
}
