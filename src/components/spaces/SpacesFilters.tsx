// ✅ file: src/components/spaces/SpacesFilters.tsx
'use client'

import { useEffect, useState } from 'react'

export interface SpacesFilterState {
  start?: string
  end?: string
  stage?: 'verd' | 'taronja' | 'all'
  finca?: string
  comercial?: string
  month?: number
  year?: number
  baseDate?: string
}

interface SpacesFiltersProps {
  onChange: (filters: SpacesFilterState) => void
}

export default function SpacesFilters({ onChange }: SpacesFiltersProps) {
  const today = new Date()
  const [filters, setFilters] = useState<SpacesFilterState>({
    month: today.getMonth(),
    year: today.getFullYear(),
    finca: '',
    comercial: '',
    stage: 'all',
    baseDate: getFirstMonday(today.getFullYear(), today.getMonth()),
  })
  const [comercialsList, setComercialsList] = useState<string[]>([])

  /** 🔁 Propaga els canvis */
  useEffect(() => {
    onChange(filters)
  }, [filters, onChange])

  /** 🧮 Càlcul del primer dilluns del mes */
  function getFirstMonday(year: number, month: number): string {
    const first = new Date(year, month, 1)
    const day = first.getDay() || 7
    if (day !== 1) first.setDate(first.getDate() - (day - 1))
    return first.toISOString().split('T')[0]
  }

  /** 📦 Carrega comercials disponibles segons setmana visible */
  useEffect(() => {
    async function loadComercials() {
      try {
        const res = await fetch(
          `/api/spaces?month=${filters.month}&year=${filters.year}&baseDate=${filters.baseDate}`
        )
        const data = await res.json()
       const noms: string[] = Array.from(
  new Set(
    data.data.flatMap((row: any) =>
      (row.dies || [])
        .filter((d: any) => typeof d?.commercial === 'string' && d.commercial.trim() !== '')
        .map((d: any) => d.commercial.trim())
    )
  )
)
setComercialsList(noms.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' })))

      } catch {
        setComercialsList([])
      }
    }
    loadComercials()
  }, [filters.month, filters.year, filters.baseDate])

  const months = [
    'Gener','Febrer','Març','Abril','Maig','Juny',
    'Juliol','Agost','Setembre','Octubre','Novembre','Desembre'
  ]

  return (
    <div className="flex flex-col gap-3 w-full border-b pb-3">
      {/* 🔹 Mes / Any */}
      <div className="flex items-center gap-2">
        <select
          value={filters.month}
          onChange={(e) => {
            const m = parseInt(e.target.value, 10)
            const y = filters.year!
            setFilters(prev => ({
              ...prev,
              month: m,
              baseDate: getFirstMonday(y, m),
            }))
          }}
          className="border rounded-md px-2 py-1 text-sm bg-white"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <select
          value={filters.year}
          onChange={(e) => {
            const y = parseInt(e.target.value, 10)
            const m = filters.month!
            setFilters(prev => ({
              ...prev,
              year: y,
              baseDate: getFirstMonday(y, m),
            }))
          }}
          className="border rounded-md px-2 py-1 text-sm bg-white w-[110px]"
        >
          {Array.from({ length: 6 }, (_, k) => today.getFullYear() - 2 + k).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* 🔹 Estat */}
      <div className="flex gap-2 mt-2">
        <select
          value={filters.stage || 'all'}
          onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value as any }))}
          className="border rounded-md px-2 py-1 text-sm bg-white w-[180px]"
        >
          <option value="all">🎨 Tots els estats</option>
          <option value="verd">✅ Confirmats</option>
          <option value="taronja">🟧 Pendents</option>
        </select>
      </div>

      {/* 🔹 Comercial i Finca */}
      <div className="flex flex-wrap gap-2 mt-2">
        <select
          value={filters.comercial || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, comercial: e.target.value }))}
          className="border rounded-md px-2 py-1 text-sm bg-white min-w-[180px]"
        >
          <option value="">👤 Tots els comercials</option>
          {comercialsList.map((nom) => (
            <option key={nom} value={nom}>{nom}</option>
          ))}
        </select>

        <select
          value={filters.finca || ''}
          onChange={(e) => setFilters(prev => ({ ...prev, finca: e.target.value }))}
          className="border rounded-md px-2 py-1 text-sm bg-white min-w-[180px]"
        >
          <option value="">🌐 Totes les finques</option>
          <option value="Font de la Canya">Font de la Canya</option>
          <option value="Clos la Plana">Clos la Plana</option>
          <option value="Masia d’Esplugues">Masia d’Esplugues</option>
          <option value="Can Farres">Can Farres</option>
          <option value="Mirador de les Caves">Mirador de les Caves</option>
          <option value="Casa del Mar">Casa del Mar</option>
        </select>
      </div>
    </div>
  )
}
