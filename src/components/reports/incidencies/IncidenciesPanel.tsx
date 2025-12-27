// file: src/components/reports/incidencies/IncidenciesPanel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersBar, type Filters } from '@/components/reports/filters/FiltersBar'
import { KpiTotal } from './KpiTotal'
import { KpiOpen } from './KpiOpen'
import { KpiTopCategory } from './KpiTopCategory'
import { KpiTopEvent } from './KpiTopEvent'
import { CategoriesTable } from './CategoriesTable'
import { EventsTable } from './EventsTable'
import type { IncidentRow, IncidentSummary } from './types'

type FilterOptions = {
  events: Array<{ id: string; name: string }>
  lines: string[]
  departments: string[]
  categories: string[]
}

const defaultOptions: FilterOptions = { events: [], lines: [], departments: [], categories: [] }

export function IncidenciesPanel() {
  const [filters, setFilters] = useState<Filters>({
    start: getISO(-30),
    end: getISO(0),
    department: '',
    event: '',
    person: '',
    line: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [rows, setRows] = useState<IncidentRow[]>([])
  const [options, setOptions] = useState<FilterOptions>(defaultOptions)
  const [summary, setSummary] = useState<IncidentSummary | null>(null)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams({
        start: filters.start,
        end: filters.end,
      })
      if (filters.event.trim()) params.set('event', filters.event.trim())
      if (filters.line.trim()) params.set('line', filters.line.trim())
      if (filters.department.trim()) params.set('department', filters.department.trim())

      const res = await fetch(`/api/reports/incidencies?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error carregant informe')
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setRows(data.data || [])
      setSummary(data.summary || null)
      setOptions(data.options || defaultOptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconegut')
      setWarnings([])
      setRows([])
      setSummary(null)
      setOptions(defaultOptions)
    }
  }, [filters])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredRows = useMemo(() => {
    // person filter not used; could filter by importance etc if added later
    return rows
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto -mx-1 px-1">
        <FiltersBar
          value={filters}
          onChange={setFilters}
          eventOptions={options.events}
          departmentOptions={options.departments}
          personOptions={[]}
          lineOptions={options.lines}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiTotal total={summary?.total || 0} />
        <KpiOpen open={summary?.open || 0} total={summary?.total || 0} />
        <KpiTopCategory summary={summary} />
        <KpiTopEvent summary={summary} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {warnings.length > 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>[!] {w}</div>
          ))}
        </div>
      )}

      <CategoriesTable data={filteredRows} />
      <EventsTable data={filteredRows} />
    </div>
  )
}

function getISO(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
