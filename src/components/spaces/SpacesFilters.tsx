//file: src/components/spaces/SpacesFilters.tsx
'use client'

import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useEffect, useState } from 'react'

interface SpacesFiltersProps {
  onChange: (filters: SpacesFilterState) => void
}

/** 🔹 Tipus de dades dels filtres */
export interface SpacesFilterState {
  start?: string
  end?: string
  stage?: 'verd' | 'blau' | 'taronja' | 'all'
  finca?: string
}

/**
 * 🧭 SpacesFilters
 * Filtres específics per al mòdul “Reserva d’Espais”.
 * - Els filtres són recíprocs: si canvies stage, es reinicia finca, i viceversa.
 * - Reutilitza la lògica i components visuals de SmartFilters.
 */
export default function SpacesFilters({ onChange }: SpacesFiltersProps) {
  const [filters, setFilters] = useState<SpacesFilterState>({
    stage: 'all',
    finca: '',
  })

  /** 🔁 Quan canvien els filtres, propaga cap al pare */
  useEffect(() => {
    onChange(filters)
  }, [filters, onChange])

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 🔹 Filtres bàsics amb SmartFilters (per dates) */}
      <SmartFilters
        role="Direcció"
        showDepartment={false}
        showWorker={false}
        showLocation={false}
        showStatus={false}
        showImportance={false}
        onChange={(f: SmartFiltersChange) => {
          setFilters(prev => ({
            ...prev,
            start: f.start,
            end: f.end,
          }))
        }}
      />

      {/* 🔹 Filtres específics d’Espais */}
      <div className="flex flex-wrap gap-2 mt-2">
        {/* Filtres per Stage */}
        <select
          value={filters.stage}
          onChange={e => {
            const val = e.target.value as 'verd' | 'blau' | 'taronja' | 'all'
            setFilters({ stage: val, finca: '' }) // 🔁 Stage reinicia finca
          }}
          className="border rounded-md px-2 py-1 text-sm bg-white"
        >
          <option value="all">🌐 Tots els estats</option>
          <option value="verd">🟩 Confirmats</option>
          <option value="taronja">🟧 Pendents</option>
          <option value="blau">🟦 Informatius</option>
        </select>

        {/* Filtres per Finca */}
        <select
          value={filters.finca}
          onChange={e => {
            const val = e.target.value
            setFilters({ finca: val, stage: 'all' }) // 🔁 Finca reinicia stage
          }}
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
