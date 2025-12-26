// file: src/app/menu/modifications/page.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useModifications } from '@/hooks/useModifications'
import ModificationsTable from './components/ModificationsTable'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { FileEdit } from 'lucide-react'
import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

export default function ModificationsPage() {
  const initialWeek = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 })
    const e = endOfWeek(new Date(), { weekStartsOn: 1 })
    return {
      from: format(s, 'yyyy-MM-dd'),
      to: format(e, 'yyyy-MM-dd'),
    }
  }, [])

  const [filters, setFilters] = useState<{
    from?: string
    to?: string
    department?: string
    importance?: string
    categoryLabel?: string
    commercial?: string
  }>({
    ...initialWeek,
    importance: 'all',
    categoryLabel: 'all',
    commercial: 'all',
  })

  const { modifications, loading, error, updateModification } = useModifications(filters)

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    modifications.forEach((m) => {
      const d = m.department?.trim()
      if (d) set.add(d)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [modifications])

  const commercialOptions = useMemo(() => {
    const set = new Set<string>()
    modifications.forEach((m) => {
      const c = m.eventCommercial?.trim()
      if (c) set.add(c)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [modifications])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    modifications.forEach((m) => {
      const label = m.category?.label?.trim()
      if (label) set.add(label)
    })
    return Array.from(set).map((label) => ({ id: label, label }))
  }, [modifications])

  const totalMods = modifications.length

  const handleFilterChange = (f: SmartFiltersChange) => {
    setFilters((prev) => ({
      ...prev,
      from: f.start,
      to: f.end,
      department: f.department,
      importance: f.importance || 'all',
      categoryLabel: f.categoryId && f.categoryId !== 'all' ? f.categoryId : 'all',
      commercial: f.commercial || 'all',
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
          <label className="text-sm font-medium text-gray-700">Comercial</label>
          <Select
            value={filters.commercial || 'all'}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, commercial: v === 'all' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots</SelectItem>
              {commercialOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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
      <ModuleHeader
        icon={<FileEdit className="w-7 h-7 text-purple-700" />}
        title="Registre de modificacions"
        subtitle="Consulta totes les modificacions registrades als esdeveniments"
      />

      <div className="text-sm font-medium px-1">
        Total modificacions: {totalMods}
      </div>

      {/* Barra compacta: només dates + botó filtres */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm mb-2 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <SmartFilters
          role="Direcció"
          onChange={handleFilterChange}
          showDepartment={false}
          showCommercial={false}
          showImportance={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          categoryOptions={categoryOptions}
          showAdvanced={false}
          compact
        />
        <div className="flex-1 min-w-[8px]" />
        <FilterButton onClick={openFiltersPanel} />
      </div>

      {loading && <p className="text-center py-10">Carregant...</p>}
      {error && <p className="text-center py-10 text-red-500">{error}</p>}
      {!loading && (
        <ModificationsTable
          modifications={modifications}
          onUpdate={updateModification}
        />
      )}
    </div>
  )
}
