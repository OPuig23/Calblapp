//file: src/components/spaces/SpacesFilters.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/** Tipus de filtres que usa tot el sistema (SidePanel, useSpaces, etc.) */
export interface SpacesFilterState {
  baseDate?: string
  month?: number
  year?: number
  stage?: 'verd' | 'taronja' | 'all'
  finca?: string
  comercial?: string
}

interface SpacesFiltersProps {
  onChange: (filters: SpacesFilterState) => void
}

export default function SpacesFilters({ onChange }: SpacesFiltersProps) {
  const today = new Date()

  const [filters, setFilters] = useState<SpacesFilterState>({
    month: today.getMonth(),
    year: today.getFullYear(),
    stage: 'all',
    finca: '',
    comercial: '',
    baseDate: getFirstMonday(today.getFullYear(), today.getMonth()),
  })

  /** 🧩 Llistes carregades dinàmicament */
  const [fincas, setFincas] = useState<string[]>([])
  const [comercials, setComercials] = useState<string[]>([])

  /** 🔁 Propaga canvis al component pare (SidePanel) */
  useEffect(() => {
    onChange(filters)
  }, [filters, onChange])

  /** 📅 Calcula el primer dilluns del mes */
  function getFirstMonday(year: number, month: number): string {
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7 // dilluns = 0
    first.setDate(first.getDate() - offset)
    const y = first.getFullYear()
    const m = String(first.getMonth() + 1).padStart(2, '0')
    const d = String(first.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // ================================================================
  // 🏡 Carrega FINQUES segons data + estat
  // ================================================================
  useEffect(() => {
    async function loadFincas() {
      try {
        const res = await fetch(
          `/api/spaces/fincas?month=${filters.month}&year=${filters.year}&baseDate=${filters.baseDate}&stage=${filters.stage || 'all'}`
        )
        const dataJson: any = await res.json()

        const rows: any[] = Array.isArray(dataJson?.data) ? dataJson.data : []

        const fincasArr: string[] = rows
          .map(r => (typeof r?.finca === 'string' ? r.finca.trim() : ''))
          .filter(Boolean)

        const list: string[] = Array.from(new Set<string>(fincasArr))

        setFincas([...list].sort((a, b) => a.localeCompare(b, 'ca')))
      } catch (err) {
        console.error('Error carregant finques:', err)
        setFincas([])
      }
    }
    if (filters.baseDate) loadFincas()
  }, [filters.month, filters.year, filters.baseDate, filters.stage])

  // ================================================================
  // 👤 Carrega COMERCIALS segons finca + estat + data
  // ================================================================
  useEffect(() => {
    async function loadComercials() {
      try {
        const res = await fetch(
          `/api/spaces/comercials?month=${filters.month}&year=${filters.year}&baseDate=${filters.baseDate}&finca=${filters.finca || ''}&stage=${filters.stage || 'all'}`
        )
        const dataJson: any = await res.json()

        const rows: any[] = Array.isArray(dataJson?.data) ? dataJson.data : []

        const noms: string[] = Array.from(
          new Set<string>(
            rows.flatMap((r: any) =>
              (r.dies || [])
                .filter(
                  (d: any) =>
                    typeof d?.commercial === 'string' && d.commercial.trim() !== ''
                )
                .map((d: any) => d.commercial.trim())
            )
          )
        )

        setComercials(
          noms.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }))
        )
      } catch (err) {
        console.error('Error carregant comercials:', err)
        setComercials([])
      }
    }
    if (filters.baseDate) loadComercials()
  }, [filters.month, filters.year, filters.baseDate, filters.finca, filters.stage])

  // ================================================================
  // 🔄 Handlers de canvis
  // ================================================================
  const handleMonthChange = (m: number) => {
    const y = filters.year!
    setFilters(prev => ({
      ...prev,
      month: m,
      finca: '',
      comercial: '',
      baseDate: getFirstMonday(y, m),
    }))
  }

  const handleYearChange = (y: number) => {
    const m = filters.month!
    setFilters(prev => ({
      ...prev,
      year: y,
      finca: '',
      comercial: '',
      baseDate: getFirstMonday(y, m),
    }))
  }

  const months = [
    'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
    'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
  ]

  // ================================================================
  // 🎨 Render UI (mòbil-first)
  // ================================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 w-full border-b pb-3"
    >
      {/* 🗓 Mes / Any */}
      <div className="flex gap-2 w-full">
        <select
          value={filters.month}
          onChange={e => handleMonthChange(parseInt(e.target.value, 10))}
          className="border rounded-md px-2 py-1 text-sm bg-white w-full"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={filters.year}
          onChange={e => handleYearChange(parseInt(e.target.value, 10))}
          className="border rounded-md px-2 py-1 text-sm bg-white w-full"
        >
          {Array.from({ length: 6 }, (_, k) => today.getFullYear() - 2 + k).map(
            y => (
              <option key={y} value={y}>
                {y}
              </option>
            )
          )}
        </select>
      </div>

      {/* 🎨 Estat */}
      <select
        value={filters.stage || 'all'}
        onChange={e =>
          setFilters(prev => ({ ...prev, stage: e.target.value as any }))
        }
        className="border rounded-md px-2 py-1 text-sm bg-white w-full"
      >
        <option value="all">🎨 Tots els estats</option>
        <option value="verd">✅ Confirmats</option>
        <option value="taronja">🟧 Pendents</option>
      </select>

      {/* 🏡 Finca */}
      <select
        value={filters.finca || ''}
        onChange={e =>
          setFilters(prev => ({ ...prev, finca: e.target.value, comercial: '' }))
        }
        className="border rounded-md px-2 py-1 text-sm bg-white w-full"
      >
        <option value="">🌐 Totes les finques</option>
        {fincas.map(f => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* 👤 Comercial */}
      <select
        value={filters.comercial || ''}
        onChange={e =>
          setFilters(prev => ({ ...prev, comercial: e.target.value }))
        }
        className="border rounded-md px-2 py-1 text-sm bg-white w-full"
      >
        <option value="">👤 Tots els comercials</option>
        {comercials.map(nom => (
          <option key={nom} value={nom}>
            {nom}
          </option>
        ))}
      </select>
    </motion.div>
  )
}
