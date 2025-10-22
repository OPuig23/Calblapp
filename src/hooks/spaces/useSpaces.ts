//field: src/hooks/spaces/useSpaces.ts
'use client'
import { useEffect, useState } from 'react'
import { SpacesFilterState } from '@/components/spaces/SpacesFilters'

export function useSpaces(filters: SpacesFilterState) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [totals, setTotals] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (filters.month !== undefined) params.append('month', String(filters.month))
        if (filters.year !== undefined) params.append('year', String(filters.year))
        if (filters.finca) params.append('finca', filters.finca)
        if (filters.comercial) params.append('comercial', filters.comercial)
        if (filters.baseDate) params.append('baseDate', filters.baseDate) // 👈 afegit

        const res = await fetch(`/api/spaces?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        setSpaces(data.data || [])
        setTotals(data.totalPaxPerDia || [])
      } catch (err: any) {
        console.error('Error carregant espais:', err)
        setError('No s’han pogut carregar les dades')
        setSpaces([])
        setTotals([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [JSON.stringify(filters)]) // 👈 assegura trigger només quan realment canvien

  return { spaces, totals, loading, error }
}
