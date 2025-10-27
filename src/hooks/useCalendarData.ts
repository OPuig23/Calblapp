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

export function useCalendarData(filters?: {
  ln?: string
  stage?: string
  start?: string
  end?: string
}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)




  // 🔹 Converteix StageGroup en col·lecció visual (normalitzat)
const normalize = (txt: string = '') =>
  txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // treu accents

const toCollection = (g: string) => {
  const t = normalize(g)
  if (t.includes('confirmat') || t.includes('confirmat')) return 'verd'
  if (t.includes('proposta')) return 'taronja'
  return 'blau'
}
  // 🔁 Carrega dades des de Firestore (via API)
  // ───────────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events/from-firestore', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      console.log(
        '📦 Dades rebudes del backend:',
        json.data.slice(0, 5).map((d: any) => ({
          id: d.id,
          LN: d.LN,
          origen: d.origen,
          DataInici: d.DataInici,
        }))
      )

      // ───────────────────────────────────────────────
      // 🗂️ Mapeig i normalització
      // ───────────────────────────────────────────────
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
          collection:  d.collection?.replace('stage_', '') || toCollection(d.StageGroup || ''),
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

      // Normalitza format de data
      mappedData.forEach((d) => {
        d.DataInici = (d.DataInici || '').slice(0, 10)
        d.DataFi = (d.DataFi || d.DataInici || '').slice(0, 10)
      })

      // ───────────────────────────────────────────────
      // 📆 Filtre per mes visible (no per data del sistema)
      // ───────────────────────────────────────────────
      const baseDate = filters?.start ? new Date(filters.start) : new Date()
      const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
      const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)

      let filtered = mappedData.filter((d) => {
        const dateStr = d.DataInici || d.Data || ''
        if (!dateStr) return false

        const date = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr)
if (isNaN(date.getTime())) return false


        // Inclou tots els esdeveniments dins el mes visible
        return date >= startOfMonth && date <= endOfMonth
      })

      console.log('🔍 AFTER temporal filter — filtered length:', filtered.length)
console.log(
  '🧮 DESPRÉS FILTRE TEMPORAL:',
  filtered.length,
  filtered.filter(d => d.origen === 'manual').map(d => ({
    id: d.id,
    Nom: d.NomEvent,
    DataInici: d.DataInici,
    LN: d.LN,
    Stage: d.StageGroup,
  }))
)

      // ───────────────────────────────────────────────
      // 🎯 Filtres per LN i Stage
      // ───────────────────────────────────────────────
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
console.log(
  '🎯 DESPRÉS FILTRES FINALS:',
  filtered.length,
  filtered.filter(d => d.origen === 'manual').map(d => d.id)
)

      // Ordena cronològicament
      filtered.sort(
        (a, b) =>
          new Date(a.DataInici || a.Data || 0).getTime() -
          new Date(b.DataInici || b.Data || 0).getTime()
      )

      console.log('HOOK → setDeals:', filtered.length, filtered.slice(0,3).map(d=>({id:d.id, Nom:d.NomEvent, Data:d.DataInici, origen:d.origen})))
console.log(
  '🧩 DEBUG MANUALS:',
  mappedData.filter(d => d.origen === 'manual').map(d => ({
    id: d.id,
    Nom: d.NomEvent,
    Data: d.DataInici,
    Stage: d.StageGroup,
    LN: d.LN,
  }))
)

      setDeals(filtered)
    } catch (e: any) {
      console.error('❌ Error carregant dades Firestore:', e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  // ───────────────────────────────────────────────
  // 🔄 Efectes reactius
  // ───────────────────────────────────────────────
 // 🔁 Recarrega quan canvien els filtres (manté mida fixa)
useEffect(() => {
  load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [filters?.ln ?? '', filters?.stage ?? '', filters?.start ?? '', filters?.end ?? ''])


  return { deals, loading, error, reload: load }
}
