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
  [key: string]: any
}

export function useCalendarData(filters?: { ln?: string; stage?: string }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🧩 Normalitza la Línia de Negoci segons codificació oficial Cal Blay
  const normalizeLN = (ln: string) => {
    const val = (ln || '').toLowerCase().trim()
    if (!val) return 'altres'
    if (val.includes('empresa')) return 'empresa'
    if (val.includes('casament') || val.includes('boda')) return 'casaments'
    if (val.includes('grup') || val.includes('restaurant')) return 'grups restaurants'
    if (val.includes('food') || val.includes('lover')) return 'foodlovers'
    if (val.includes('agenda')) return 'agenda'
    return 'altres'
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
    console.log('📦 Dades rebudes del backend (LN):', json.data.slice(0, 5).map(d => ({ id: d.id, LN: d.LN, origen: d.origen })))


      const today = new Date()
      const oneMonthAgo = new Date(today)
      oneMonthAgo.setMonth(today.getMonth() - 1)
      const todayISO = today.toISOString().slice(0, 10)
      const limitPastISO = oneMonthAgo.toISOString().slice(0, 10)

const mappedData: Deal[] = (json.data || []).map((d: any) => {
  const fileFields = Object.fromEntries(
    Object.entries(d).filter(([key]) => key.startsWith('file'))
  )

  return {
    id: d.id,
    NomEvent: d.NomEvent || '—',
    Comercial: d.Comercial || '—',
   LN: d.LN || 'Altres',

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
    ...fileFields,
  }
})

// 👉 Afegeix el log aquí (fora del map)
console.log(
  '🎨 mappedData LN check:',
  mappedData.slice(0, 5).map(d => ({ id: d.id, LN: d.LN, origen: d.origen }))
)


      // 🔹 Filtres temporals
  let filtered = mappedData.filter((d) => {
  const date = d.DataInici || ''
  if (!date) return false
  const coll = (d.collection || '').toLowerCase()
  if (coll.includes('verd')) return date >= limitPastISO
  return date >= todayISO
})


      // 🔹 Filtres per LN / Stage
      if (filters?.ln && filters.ln !== 'Tots') {
        const lnValue = filters.ln.toLowerCase()
        filtered = filtered.filter((d) => (d.LN || '').toLowerCase() === lnValue)
      }
      if (filters?.stage && filters.stage !== 'Tots') {
        const stageValue = filters.stage.toLowerCase()
        filtered = filtered.filter((d) =>
          (d.StageGroup || '').toLowerCase().includes(stageValue)
        )
      }

      filtered.sort(
        (a, b) =>
          new Date(a.DataInici || a.Data || 0).getTime() -
          new Date(b.DataInici || b.Data || 0).getTime()
      )

      setDeals(filtered)
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
