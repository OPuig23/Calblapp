//file: src/app/menu/incidents/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

import ModuleHeader from '@/components/layout/ModuleHeader'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useIncidents } from '@/hooks/useIncidents'
import IncidentsTable from './components/IncidentsTable'

export default function IncidentsPage() {
  const [filters, setFilters] = useState({
    from: undefined as string | undefined,
    to: undefined as string | undefined,
    department: undefined as string | undefined,
    importance: 'all' as string,
    categoryLabel: 'all' as string,
  })

  const { incidents, loading, error, updateIncident } = useIncidents(filters)

  // 🔹 Derivem categories automàticament
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    incidents.forEach((i) => {
      const label = i.category?.label?.trim()
      if (label) set.add(label)
    })
    return Array.from(set).map((l) => ({ id: l, label: l }))
  }, [incidents])

  // 🔹 Total incidències del rang
  const totalIncidencies = incidents.length

  const handleFilterChange = (f: SmartFiltersChange) => {
    setFilters(prev => ({
      ...prev,
      from: f.start,
      to: f.end,
      department: f.department,
      importance: f.importance || 'all',
      categoryLabel:
        f.categoryId && f.categoryId !== 'all' ? f.categoryId : 'all',
    }))
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Capçalera principal */}
      <ModuleHeader
        icon={<AlertTriangle className="w-7 h-7 text-yellow-600" />}
        title="Incidències"
        subtitle="Tauler de treball setmanal"
      />

      {/* Total incidències de la setmana */}
      <div className="text-sm font-medium px-1">
        Total incidències: {totalIncidencies}
      </div>

      {/* Barra de filtres */}
      <div
        className="
          rounded-2xl border border-gray-200 bg-white p-3 shadow-sm mb-2
          flex flex-col gap-3
          sm:flex-row sm:items-center sm:flex-wrap
        "
      >
        <SmartFilters
          role="Direcció"
          onChange={handleFilterChange}
          showDepartment
          showWorker={false}
          showLocation={false}
          showStatus={false}
          showImportance
          categoryOptions={categoryOptions}
        />
      </div>

      {/* Contingut */}
      {loading && <p className="text-center py-10">Carregant…</p>}
      {error && <p className="text-center py-10 text-red-500">{error}</p>}

      {!loading && !error && (
        <IncidentsTable
          incidents={incidents}
          onUpdate={updateIncident}
        />
      )}
    </div>
  )
}
