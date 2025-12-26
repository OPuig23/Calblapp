// file: src/app/menu/incidents/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

import ModuleHeader from '@/components/layout/ModuleHeader'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useIncidents } from '@/hooks/useIncidents'
import IncidentsTable from './components/IncidentsTable'
import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'

export default function IncidentsPage() {
  const [filters, setFilters] = useState({
    from: undefined as string | undefined,
    to: undefined as string | undefined,
    department: undefined as string | undefined,
    importance: 'all' as string,
    categoryLabel: 'all' as string,
  })

  const { incidents, loading, error, updateIncident } = useIncidents(filters)

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    incidents.forEach((i) => {
      const dep = i.department?.trim()
      if (dep) set.add(dep)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [incidents])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    incidents.forEach((i) => {
      const label = i.category?.label?.trim()
      if (label) set.add(label)
    })
    return Array.from(set).map((l) => ({ id: l, label: l }))
  }, [incidents])

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

  const { setContent, setOpen } = useFilters()

  const openFiltersPanel = () => {
    setContent(
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Departament</label>
          <Select
            value={filters.department || 'all'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, department: v === 'all' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Importància</label>
          <Select
            value={filters.importance || 'all'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, importance: v === 'all' ? 'all' : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Totes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Totes</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="mitjana">Mitjana</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Categoria</label>
          <Select
            value={filters.categoryLabel || 'all'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, categoryLabel: v === 'all' ? 'all' : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Totes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Totes</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
    setOpen(true)
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

      {/* Barra compacta: només dates + botó filtres */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm mb-2 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <SmartFilters
          role="Direcció"
          onChange={handleFilterChange}
          showDepartment={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          showImportance={false}
          categoryOptions={categoryOptions}
          showAdvanced={false}
          compact
        />
        <div className="flex-1 min-w-[8px]" />
        <FilterButton onClick={openFiltersPanel} />
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
