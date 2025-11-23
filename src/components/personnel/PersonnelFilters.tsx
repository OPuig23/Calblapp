// file: src/components/personnel/PersonnelFilters.tsx
'use client'

import React from 'react'
import ResetFilterButton from '@/components/ui/ResetFilterButton'

type FilterState = {
  roleType: string
  isDriver: 'all' | 'yes' | 'no'
  department: string
}

interface Props {
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
}

export default function PersonnelFilters({ filters, onFiltersChange }: Props) {

  // 🔁 Actualització reactiva (igual que TornsFilters)
  const update = (patch: Partial<FilterState>) => {
    onFiltersChange({
      ...filters,
      ...patch
    })
  }

  return (
    <div className="p-4 space-y-4 text-sm">

      {/* 🔹 Rol */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Rol</label>
        <select
          className="h-10 rounded-xl border bg-white px-3"
          value={filters.roleType}
          onChange={(e) => update({ roleType: e.target.value })}
        >
          <option value="">🌐 Tots</option>
          <option value="responsable">Responsable</option>
          <option value="treballador">Treballador</option>
          <option value="conductor">Conductor</option>
        </select>
      </div>

      {/* 🔹 Conductor */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Conductor</label>
        <select
          className="h-10 rounded-xl border bg-white px-3"
          value={filters.isDriver}
          onChange={(e) => update({ isDriver: e.target.value as any })}
        >
          <option value="all">🌐 Tots</option>
          <option value="yes">✅ Sí</option>
          <option value="no">❌ No</option>
        </select>
      </div>

      {/* 🔹 Departament */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Departament</label>
        <select
          className="h-10 rounded-xl border bg-white px-3"
          value={filters.department}
          onChange={(e) => update({ department: e.target.value })}
        >
          <option value="">🌐 Tots</option>
          <option value="serveis">Serveis</option>
          <option value="cuina">Cuina</option>
          <option value="logistica">Logística</option>
          <option value="foodlovers">Food Lovers</option>
          <option value="total">Total</option>
        </select>
      </div>

      {/* 🔄 Botó universal de reinici (mateix disseny a tota la App) */}
      <div className="flex justify-end pt-2">
        <ResetFilterButton
          onClick={() =>
            onFiltersChange({
              roleType: '',
              isDriver: 'all',
              department: ''
            })
          }
        />
      </div>

    </div>
  )
}
