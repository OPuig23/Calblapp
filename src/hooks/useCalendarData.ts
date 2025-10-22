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
  Ubicacio?: string
  Color: string
  StageDot?: string
  origen?: 'zoho' | 'manual'
  updatedAt?: string
  Menu?: string[]
  NumPax?: number | string | null
  code?: string
}

export function useCalendarData(filters?: { ln?: string; stage?: string }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizeLN = (ln: string) => {
    const val = (ln || '').toLowerCase().trim()
    if (!val) return 'Altres'
    if (val.includes('boda')) return 'Casaments'
    if (val.includes('empresa')) return 'Empresa'
    if (val.includes('grup') || val.includes('restaur')) return 'Grups Restaurants'
    if (val.includes('comida') || val.includes('food')) return 'Comida Preparada'
    return ln.trim()
  }

  const toCollection = (g: string) =>
    g?.toLowerCase().includes('confirmat')
      ? 'verd'
      : g?.toLowerCase().includes('proposta')
      ? 'taronja'
      : 'blau'

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/from-firestore', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      const today = new Date()
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(today.getMonth() - 1)
      const todayISO = today.toISOString().slice(0, 10)
      const limitPastISO = oneMonthAgo.toISOString().slice(0, 10)

      let data: Deal[] = (json.data || []).map((d: any) => ({
        id: d.id,
        NomEvent: d.NomEvent || '—',
        Comercial: d.Comercial || '—',
        LN: normalizeLN(d.LN || ''),
        Servei: d.Servei || '',
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
        NumPax: d.NumPax ?? '',
        code: d.code || '',
      }))

      // filtres temporals
      data = data.filter((d) => {
        const date = d.DataInici || ''
        if (!date) return false
        if (d.collection === 'verd') return date >= limitPastISO
        return date >= todayISO
      })

      // filtres LN/Stage
      if (filters?.ln && filters.ln !== 'Tots') {
        const lnValue = String(filters.ln).toLowerCase()
        data = data.filter((d) => (d.LN || '').toLowerCase() === lnValue)
      }
      if (filters?.stage && filters.stage !== 'Tots') {
        const stageValue = String(filters.stage).toLowerCase()
        data = data.filter((d) => (d.StageGroup || '').toLowerCase().includes(stageValue))
      }

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
