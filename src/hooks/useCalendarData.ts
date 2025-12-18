'use client'

import { useEffect, useState } from 'react'

export interface Deal {
  id: string
  NomEvent: string
  Comercial: string
  LN?: string
  Servei?: string
  StageGroup: string
  collection?: 'stage_verd' | 'stage_taronja' | 'stage_groc'
  DataInici?: string
  DataFi?: string
  Ubicacio?: string
  Color: string
  StageDot?: string
  origen?: 'zoho' | 'manual' | 'firestore'
  NumPax?: number | string | null
  ObservacionsZoho?: string
  code?: string
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

  const normalize = (v = '') =>
    v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const isAll = (v?: string) => {
    const n = normalize(v || '')
    if (!n) return true
    if (n === 'all') return true
    if (n.startsWith('tots') || n.startsWith('totes')) return true
    return false
  }

  const normalizeCollection = (
    c?: string
  ): 'stage_verd' | 'stage_taronja' | 'stage_groc' | '' => {
    const n = normalize(c || '')
    if (!n) return ''
    if (n.startsWith('stage_')) return n as any
    if (n === 'verd') return 'stage_verd'
    if (n === 'taronja') return 'stage_taronja'
    if (n === 'groc') return 'stage_groc'
    return ''
  }

  const load = async () => {
    setLoading(true)
    try {
      const start = filters?.start
      const end = filters?.end

      const res = await fetch(
        `/api/events/calendar?start=${start}&end=${end}`,
        { cache: 'no-store' }
      )

      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      if (!Array.isArray(json?.events)) {
        setDeals([])
        return
      }

      let data: Deal[] = json.events.map((ev: any) => ({
        id: ev.id,
        NomEvent: ev.summary || '(Sense títol)',
        Comercial: ev.Comercial || ev.comercial || '',
        LN: ev.LN || ev.lnLabel || 'Altres',
        Servei: ev.Servei || ev.servei || '',
        StageGroup: ev.StageGroup || '',
        collection: normalizeCollection(ev.collection) || undefined,

        DataInici: ev.start?.slice(0, 10),
        DataFi: ev.end?.slice(0, 10),
        Ubicacio: ev.Ubicacio || '',
        Color: ev.Color || '',
        StageDot: ev.StageDot || '',

        // 🔧 FIX CRÍTIC
        NumPax:
          ev.NumPax ??
          ev.numPax ??
          ev.pax ??
          ev.PAX ??
          null,

        // 🔧 FIX CRÍTIC
        ObservacionsZoho:
          ev.ObservacionsZoho ??
          ev.observacionsZoho ??
          ev.Observacions ??
          ev.observacions ??
          '',

        code: ev.code || '',
        origen: ev.origen || 'firestore',
      }))

      /* ───────────── LN ───────────── */
      if (!isAll(filters?.ln)) {
        const ln = normalize(filters!.ln!)
        data = data.filter((d) => normalize(d.LN || '') === ln)
      }

      /* ───────────── STAGE ───────────── */
      if (!isAll(filters?.stage)) {
        const st = normalize(filters!.stage!)
        data = data.filter((d) => {
          const col = d.collection || ''
          if (st === 'confirmat') return col === 'stage_verd'
          if (st === 'calentet') return col === 'stage_taronja'
          if (st === 'pressupost') return col === 'stage_groc'
          return true
        })
      }

      /* ───────────── COMERCIAL ───────────── */
      if (!isAll(filters?.commercial)) {
        const c = normalize(filters!.commercial!)
        data = data.filter((d) => normalize(d.Comercial || '') === c)
      }

      data.sort(
        (a, b) =>
          new Date(a.DataInici || '').getTime() -
          new Date(b.DataInici || '').getTime()
      )

      setDeals(data)
      setError(null)
    } catch (e: any) {
      console.error(e)
      setDeals([])
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.ln,
    filters?.stage,
    filters?.commercial,
    filters?.start,
    filters?.end,
  ])

  return { deals, loading, error, reload: load }
}
