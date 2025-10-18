//file: src/hooks/useCalendarData.ts
'use client'

import { useEffect, useState } from 'react'

/**
 * 🔹 Tipus d'esdeveniment unificat
 * - Dades provinents de Firestore (tres col·leccions)
 * - Compatible amb Calendar, Quadrants i Esdeveniments
 */
export interface Deal {
  id: string
  NomEvent: string
  Comercial: string
  Servei: string      // = LN (Pipeline)
  StageGroup: string  // = blau / taronja / verd
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
}

/**
 * 📦 Hook — Llegeix tots els esdeveniments des del Firestore (API)
 * Retorna: dades, estat de càrrega i funció de recàrrega
 */
export function useCalendarData() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/events/from-firestore', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()

      const data: Deal[] = (json.data || []).map((d: any) => ({
        id: d.id,
        NomEvent: d.NomEvent || '—',
        Comercial: d.Comercial || '—',
        Servei: d.LN || d.Servei || '—',
        StageGroup: d.StageGroup || 'Sense categoria',
        Data: d.Data || '',
        DataInici: d.DataInici || d.Data || '',
        DataFi: d.DataFi || d.DataInici || d.Data || '',
        Hora: d.Hora || '',
        Ubicacio: d.Ubicacio || '',
        Color: d.Color || 'border-gray-300 bg-gray-100 text-gray-700',
        StageDot: d.StageDot || '',
        origen: d.origen || 'zoho',
        updatedAt: d.updatedAt || '',
      }))

      // Ordenem cronològicament
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
  }, [])

  return { deals, loading, error, reload: load }
}
