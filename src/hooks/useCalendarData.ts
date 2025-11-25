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
  collection?: string
  Data?: string
  DataInici?: string
  DataFi?: string
  Ubicacio?: string
  Color: string
  StageDot?: string
  origen?: 'zoho' | 'manual' | 'firestore'
  updatedAt?: string
  NumPax?: number | string | null
  code?: string

  // 🆕 AFEGIT → llista neta de fitxers
  files?: { key: string; url: string }[]

  [key: string]: any
}

export function useCalendarData(filters?: {
  ln?: string
  stage?: string
  commercial?: string 
  start?: string
  end?: string
}) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Normalització
  const normalize = (txt: string = '') =>
    txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Carregar dades API
  const load = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const start = filters?.start || today.toISOString().slice(0, 10)
      const end =
        filters?.end ||
        new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)

      console.log('🕒 Fetch /api/events/calendar', { start, end })
      const res = await fetch(`/api/events/calendar?start=${start}&end=${end}`, {
        cache: 'no-store',
      })

      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      if (!json || !Array.isArray(json.events)) {
        console.error('⚠️ Resposta inesperada:', json)
        setDeals([])
        setError('Cap dada trobada')
        return
      }

      const events = json.events

      // ---------------------------------------------------------------------
      // 🧩 MAPEGEM EVENTS → DEAL COMPLET
      // ---------------------------------------------------------------------
      const mappedData: Deal[] = events.map((ev: any) => {
        // 🔍 Buscar tots els fileN
        const fileEntries = Object.entries(ev)
          .filter(
            ([k, v]) =>
              k.toLowerCase().startsWith('file') &&
              typeof v === 'string' &&
              v.length > 0
          )
          .map(([k, v]) => ({
            key: k,
            url: v as string,
            index: parseInt(k.replace(/[^0-9]/g, ''), 10) || 0,
          }))
          .sort((a, b) => a.index - b.index)

        return {
          id: ev.id || crypto.randomUUID(),
          NomEvent: ev.summary || '(Sense títol)',
          Comercial: ev.comercial || ev.Comercial || '—',
          LN: ev.lnLabel || 'Altres',
          Servei: ev.servei || ev.Servei || '',
          StageGroup: ev.stageGroup || ev.StageGroup || '',
          collection: ev.collection || 'stage_verd',
          Data: ev.day || ev.start || '',
          DataInici: ev.start ? ev.start.slice(0, 10) : '',
          DataFi: ev.end ? ev.end.slice(0, 10) : '',
          HoraInici: ev.HoraInici || ev.horaInici || '',
          Ubicacio: ev.location || ev.Ubicacio || '',
          Color:
            ev.stageGroup === 'verd'
              ? 'border-green-300 bg-green-50 text-green-700'
              : ev.stageGroup === 'taronja'
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-blue-300 bg-blue-50 text-blue-700',
          StageDot: ev.stageGroup || '',
          origen: 'firestore',
          updatedAt: ev.updatedAt || '',
          NumPax: ev.numPax ?? ev.NumPax ?? '',
          code: ev.code || ev.Code || ev.Codi || ev.eventCode || '',


          // 🆕 FITXERS NETS I ORDENATS
          files: fileEntries.map((f) => ({ key: f.key, url: f.url })),
        }
      })

      // ---------------------------------------------------------------------
      // 🎯 FILTRES
      // ---------------------------------------------------------------------
      let filtered = mappedData

      if (filters?.ln && filters.ln !== 'Tots') {
        const lnValue = filters.ln.toLowerCase()
        filtered = filtered.filter(
          (d) => (d.LN || '').toLowerCase() === lnValue
        )
      }

      if (filters?.stage && filters.stage !== 'Tots') {
        const stageValue = filters.stage.toLowerCase()
        filtered = filtered.filter((d) =>
          (d.StageGroup || '').toLowerCase().includes(stageValue)
        )
      }
      if (filters?.commercial && filters.commercial !== 'Tots') {
  const comValue = filters.commercial.toLowerCase()
  filtered = filtered.filter(
    (d) => (d.Comercial || '').toLowerCase() === comValue
  )
}


      // Ordenació cronològica
      filtered.sort(
        (a, b) =>
          new Date(a.DataInici || a.Data || 0).getTime() -
          new Date(b.DataInici || b.Data || 0).getTime()
      )

      setDeals(filtered)
    } catch (e: any) {
      console.error('❌ Error carregant dades Firestore:', e)
      setError(String(e))
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  // Carrega inicial i reactiva
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.ln ?? '',
    filters?.stage ?? '',
    filters?.commercial ?? '', 
    filters?.start ?? '',
    filters?.end ?? '',
  ])

  return { deals, loading, error, reload: load }
}
