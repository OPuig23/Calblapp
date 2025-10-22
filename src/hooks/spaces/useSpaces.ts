//file: src/hooks/spaces/useSpaces.ts
'use client'
import { useEffect, useState } from 'react'
import { SpacesFilterState } from '@/components/spaces/SpacesFilters'

export function useSpaces(filters: SpacesFilterState) {
  const [spaces, setSpaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekLabel, setWeekLabel] = useState('Setmana actual')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()

        if (filters.stage && filters.stage !== 'all')
          params.append('stage', filters.stage)
        if (filters.finca) params.append('finca', filters.finca)

        // 🗓️ Si l’usuari ha triat una data → fem servir “start”
        const baseDate =
          filters.start || new Date().toISOString().split('T')[0]

        params.append('week', baseDate)

        const res = await fetch(`/api/spaces?${params.toString()}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        setSpaces(data.spaces || [])
      } catch (err) {
        console.error('Error carregant espais', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  return { spaces, loading, weekLabel }
}
