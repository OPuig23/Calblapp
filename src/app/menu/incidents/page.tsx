// file:src\app\menu\incidents\page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useIncidents } from '@/hooks/useIncidents'
import IncidentsList from './components/IncidentsList'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { AlertTriangle } from 'lucide-react'

export default function IncidentsPage() {
  // Estat inicial
  const [filters, setFilters] = useState<{
    from?: string
    to?: string
    department?: string
    importance?: string
    categoryLabel?: string
  }>({
    importance: 'all',
    categoryLabel: 'all',
  })

  // Hook de dades
  const { incidents, loading, error } = useIncidents(filters)

  // Gestió de canvis de filtres
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

  // Construcció d’opcions de categories
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const inc of incidents) {
      const label = inc.category?.label?.trim()
      if (label) set.add(label)
    }
    return Array.from(set).map(label => ({
      id: label,
      label,
    }))
  }, [incidents])

  return (
    <div className="p-4">
      {/* 🔹 Capçalera */}
      <ModuleHeader
        icon={<AlertTriangle className="w-7 h-7 text-yellow-600" />}
        title="Incidències"
        subtitle="Gestiona i consulta les incidències dels esdeveniments"
      />

{/* 🔹 Barra de filtres (UNA SOLA FILERA, RESPONSIVE) */}
<div
  className="
    rounded-2xl border border-gray-200 bg-white p-3 shadow-sm mb-6
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



      {/* 🔹 Contingut */}
      {loading && <p className="text-center py-10">Carregant…</p>}
      {error && <p className="text-center py-10 text-red-500">{error}</p>}
      {!loading && <IncidentsList incidents={incidents} />}
    </div>
  )
}
