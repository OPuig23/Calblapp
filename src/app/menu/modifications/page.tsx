// file: src/app/menu/modifications/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useModifications } from '@/hooks/useModifications'
import ModificationsList from './components/ModificationsList'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { FileEdit } from 'lucide-react'

export default function ModificationsPage() {
  // Estat de filtres
  const [filters, setFilters] = useState<{
    from?: string
    to?: string
    department?: string
    importance?: string
    categoryId?: string
  }>({
    importance: 'all',
    categoryId: 'all',
  })

  // Hook de dades
  const { modifications, loading, error } = useModifications(filters)

  // Canvi de filtres
  const handleFilterChange = (f: SmartFiltersChange) => {
    setFilters(prev => ({
      ...prev,
      from: f.start,
      to: f.end,
      department: f.department,
      importance: f.importance || 'all',
      categoryId:
        f.categoryId && f.categoryId !== 'all' ? f.categoryId : 'all',
    }))
  }

  // Construcció d’opcions de categories
  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const mod of modifications) {
      const label = mod.category?.label?.trim()
      if (label) set.add(label)
    }
    return Array.from(set).map(label => ({
      id: label,
      label,
    }))
  }, [modifications])

  return (
    <div className="p-4">
      {/* 🔹 Capçalera */}
      <ModuleHeader
        icon={<FileEdit className="w-7 h-7 text-purple-700" />}
        title="Registre de modificacions"
        subtitle="Consulta totes les modificacions registrades als esdeveniments"
      />

      {/* 🔹 Barra de filtres */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm mb-6">
        <SmartFilters
          role="Direcció"
          onChange={handleFilterChange}
          showDepartment
          showImportance
          categoryOptions={categoryOptions}
        />
      </div>

      {/* 🔹 Contingut */}
      {loading && <p className="text-center py-10">Carregant…</p>}
      {error && <p className="text-center py-10 text-red-500">{error}</p>}
      {!loading && <ModificationsList modifications={modifications} />}
    </div>
  )
}
