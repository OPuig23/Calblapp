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

  // 🔹 Funcions de normalització
  const normalize = (txt: string = '') =>
    txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const toCollection = (state: string) => {
    const t = normalize(state)
    if (t.includes('confirm')) return 'verd'
    if (t.includes('pend') || t.includes('proposta')) return 'taronja'
    return 'blau'
  }

  // 🔁 Carrega dades del backend (Firestore via API)
  const load = async () => {
    setLoading(true)
    try {
      // 🗓️ Defineix rang temporal per defecte (una setmana)
      const today = new Date()
      const start = filters?.start || today.toISOString().slice(0, 10)
      const end = filters?.end || new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)

      console.log('🕒 Fetch /api/events/list', { start, end })
      const res = await fetch(`/api/events/calendar?start=${start}&end=${end}`, { cache: 'no-store' })


      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      // ⚠️ Validació de resposta
      if (!json || !Array.isArray(json.events)) {
        console.error('⚠️ Resposta inesperada de /api/events/list:', json)
        setDeals([])
        setError('Cap dada trobada')
        return
      }

      const events = json.events
      console.log('📦 Dades rebudes del backend:', events.slice(0, 5))

      // 🗂️ Mapeig dels nous camps → format intern
      const mappedData: Deal[] = events.map((ev: any) => ({
        id: ev.id || crypto.randomUUID(),
        NomEvent: ev.summary || '(Sense títol)',
        Comercial: ev.responsableName || '—',
        LN: ev.lnLabel || 'Altres',
        Servei: ev.lnKey || '',
        StageGroup: ev.state || 'Sense categoria',
        collection: ev.collection || 'stage_verd',
        Data: ev.day || ev.start || '',
        DataInici: ev.start ? ev.start.slice(0, 10) : '',
        DataFi: ev.end ? ev.end.slice(0, 10) : '',
        HoraInici: ev.HoraInici || ev.horaInici || '', // 🕒 Importem l’hora d’inici si existeix
        Ubicacio: ev.location || '',
        Color:
          ev.state === 'confirmed'
            ? 'border-green-300 bg-green-50 text-green-700'
            : ev.state === 'pending'
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-blue-300 bg-blue-50 text-blue-700',
        StageDot: ev.state || '',
        origen: 'firestore',
        updatedAt: ev.updatedAt || '',
        NumPax: ev.pax ?? '',
        code: ev.eventCode || '',
      }))

      // 🎯 Aplicar filtres opcionals
      let filtered = mappedData

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

      // ⏰ Ordenació cronològica
      filtered.sort(
        (a, b) =>
          new Date(a.DataInici || a.Data || 0).getTime() -
          new Date(b.DataInici || b.Data || 0).getTime()
      )

      console.log('✅ Final mapped & filtered:', filtered.length)
      setDeals(filtered)
    } catch (e: any) {
      console.error('❌ Error carregant dades Firestore:', e)
      setError(String(e))
      setDeals([])
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Efectes reactius
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.ln ?? '', filters?.stage ?? '', filters?.start ?? '', filters?.end ?? ''])

  return { deals, loading, error, reload: load }
}
