// ✅ file: src/hooks/useCalendarData.ts
'use client'

import { useEffect, useState } from 'react'

export interface Deal {
  id: string
  NomEvent: string
  Comercial: string
  LN?: string
  Servei?: string
  StageGroup: string
  collection?: 'blau' | 'taronja' | 'verd' | string
  Data?: string
  DataInici?: string
  DataFi?: string
  Hora?: string
  Ubicacio?: string
  Color: string
  StageDot?: string
  origen?: 'zoho' | 'manual'
  updatedAt?: string
  Menu?: string[]
  NumPax?: number | string | null
  code?: string
}

/**
 * Hook unificat per carregar i filtrar esdeveniments de Firestore
 */
export function useCalendarData(filters?: { ln?: string; stage?: string }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeLN = (ln: string) => {
    if (!ln) return 'Altres'
    const val = ln.toLowerCase().trim()
    if (val.includes('boda')) return 'Casaments'
    if (val.includes('empresa')) return 'Empresa'
    if (val.includes('grup')) return 'Grups Restaurants'
    if (val.includes('food')) return 'Foodlovers'
    if (val.includes('agenda')) return 'Agenda'
    return 'Altres'
  }

  const toCollection = (g: string) =>
    g?.toLowerCase().includes('confirmat')
      ? 'verd'
      : g?.toLowerCase().includes('proposta')
      ? 'taronja'
      : 'blau'

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/events/from-firestore', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      let data: Deal[] = (json.data || []).map((d: any) => ({
        id: d.id,
        NomEvent: d.NomEvent || '—',
        Comercial: d.Comercial || '—',
        LN: normalizeLN(d.LN || d.Servei || ''),
        Servei: normalizeLN(d.Servei || d.LN || ''),
        StageGroup: d.StageGroup || 'Sense categoria',
        collection: d.collection || toCollection(d.StageGroup || ''),
        Data: d.Data || '',
        DataInici: d.DataInici || d.Data || '',
        DataFi: d.DataFi || d.DataInici || d.Data || '',
        Ubicacio: d.Ubicacio || '',
        Color: d.Color || 'border-gray-300 bg-gray-100 text-gray-700',
        StageDot: d.StageDot || '',
        origen: d.origen || 'zoho',
        updatedAt: d.updatedAt || '',
        Menu: d.Menu || [],
        NumPax: d.NumPax || '',
        code: d.code || '',
      }))

      // 🔍 Filtres actius (amb protecció de tipus)
if (filters?.ln && filters.ln !== 'Tots') {
  const lnValue = filters.ln.toLowerCase()
  data = data.filter((d) => (d.LN || '').toLowerCase() === lnValue)
}

if (filters?.stage && filters.stage !== 'Tots') {
  const stageValue = filters.stage.toLowerCase()
  data = data.filter((d) =>
    (d.StageGroup || '').toLowerCase().includes(stageValue)
  )
}


      // 🔄 Ordenar cronològicament
      data.sort(
        (a, b) =>
          new Date(a.DataInici || a.Data || 0).getTime() -
          new Date(b.DataInici || b.Data || 0).getTime()
      )

      setDeals(data)
    } catch (e: any) {
      console.error('❌ Error carregant dades Firestore:', e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filters?.ln, filters?.stage])

  return { deals, loading, error, reload: load }
}
