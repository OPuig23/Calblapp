//filename: src/hooks/quadrants/useQuadrantsByDept.ts
'use client'

import { useEffect, useState, useMemo } from 'react'

/**
 * 🧩 Tipus de dades — coherent amb Firestore
 */
export interface QuadrantData {
  id: string
  code?: string               // ✅ Codi Firestore real
  department: string
  eventName: string
  location?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  responsable?: string
  conductors?: { name: string; plate?: string; vehicleType?: string }[]
  treballadors?: { name: string; role?: string }[]
  pax?: number
  dressCode?: string
  status?: string
  displayDate?: string         // Data formatejada “dd/mm — Dimecres”
}

/**
 * 🔹 Hook per carregar quadrants setmanals segons departament i setmana
 */
export default function useQuadrantsByDept(
  departament: string,
  startDate: string,
  endDate: string
) {
  const [data, setData] = useState<QuadrantData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!departament || !startDate || !endDate) return
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          department: departament,
          start: startDate,
          end: endDate,
        })

        const res = await fetch(`/api/quadrants/get?${params.toString()}`)
        const json = await res.json()

        if (!res.ok) {
          console.error('❌ Error API quadrants/get:', json.error)
          throw new Error(json.error || 'Error desconegut')
        }

        // 🗓️ Formatem la data i afegim displayDate
        const formatted = (json.quadrants || []).map((q: any) => {
          const d = q.startDate ? new Date(q.startDate) : null
          const dayName = d
            ? d.toLocaleDateString('ca-ES', { weekday: 'long' })
            : ''
          const dayNum = d
            ? d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })
            : ''

          return {
            ...q,
            code: q.code || q.eventCode || q.id, // ✅ ara usa "code" de Firestore
            displayDate: d
              ? `${dayNum} — ${
                  dayName.charAt(0).toUpperCase() + dayName.slice(1)
                }`
              : '',
          }
        })

        console.log('✅ Quadrants carregats:', formatted.length)
        setData(formatted)
      } catch (err: any) {
        console.error('⚠️ Error useQuadrantsByDept:', err)
        setError(err.message || 'Error carregant quadrants')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [departament, startDate, endDate])

  // Agrupació opcional per dia
  const groupedByDay = useMemo(() => {
    const groups: Record<string, QuadrantData[]> = {}
    data.forEach((q) => {
      const key = q.displayDate || 'Sense data'
      if (!groups[key]) groups[key] = []
      groups[key].push(q)
    })
    return groups
  }, [data])

  return { quadrants: data, groupedByDay, loading, error }
}
