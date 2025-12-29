// file: src/components/reports/PersonalPanel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersBar, type Filters } from '@/components/reports/filters/FiltersBar'
import KpiWorkersPerEvent from '@/components/reports/personal/KpiWorkersPerEvent'
import KpiAssignmentsPerEvent from '@/components/reports/personal/KpiAssignmentsPerEvent'
import KpiHoursReal from '@/components/reports/personal/KpiHoursReal'
import KpiHoursTheoretical from '@/components/reports/personal/KpiHoursTheoretical'
import TopHoursTable from '@/components/reports/personal/TopHoursTable'
import DeptSummaryTable from '@/components/reports/personal/DeptSummaryTable'
import type { Summary } from '@/components/reports/personal/types'

type FilterOptions = {
  events: Array<{ id: string; name: string }>
  departments: string[]
  persons: string[]
  lines: string[]
}

type PersonRow = {
  id: string
  name: string
  department: string
  hours: number
  events: number
  roles: Summary['roles']
}

export function PersonalPanel() {
  const defaultRange = getCurrentWeekRange()
  const [filters, setFilters] = useState<Filters>({
    start: defaultRange.start,
    end: defaultRange.end,
    department: '',
    event: '',
    person: '',
    line: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<PersonRow[]>([])
  const [options, setOptions] = useState<FilterOptions>({
    events: [],
    departments: [],
    persons: [],
    lines: [],
  })

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams({
        start: filters.start,
        end: filters.end,
      })
      if (filters.department.trim()) params.set('departments', filters.department.trim())
      if (filters.event.trim()) params.set('event', filters.event.trim())
      // person/line encara no s'apliquen a l'API, es pot filtrar client-side si cal.
      const res = await fetch(`/api/reports/personal?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error carregant informe')
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setSummary(data.summary)
      setRows(data.data || [])
      const fallbackPersons = Array.from(new Set((data.data || []).map((p: any) => p?.name || p?.id))).filter(Boolean)
      const fallbackDepts = Array.from(new Set((data.data || []).map((p: any) => p?.department))).filter(Boolean)
      setOptions({
        events: data.options?.events || [],
        departments: data.options?.departments || fallbackDepts,
        persons: data.options?.persons || fallbackPersons,
        lines: data.options?.lines || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconegut')
      setSummary(null)
      setRows([])
      setWarnings([])
      setOptions({ events: [], departments: [], persons: [], lines: [] })
    }
  }, [filters])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const topHours = useMemo(() => {
    const needle = filters.person.trim().toLowerCase()
    const filtered = needle
      ? rows.filter(
          r =>
            r.name.toLowerCase().includes(needle) ||
            r.id.toLowerCase().includes(needle) ||
            r.department.toLowerCase().includes(needle)
        )
      : rows
    return [...filtered].sort((a, b) => b.hours - a.hours).slice(0, 8)
  }, [rows, filters.person])

  const deptAgg = useMemo(() => {
    const map = new Map<string, { hours: number; people: number }>()
    rows.forEach(r => {
      const key = r.department || 'sense dept'
      const current = map.get(key) || { hours: 0, people: 0 }
      current.hours += r.hours
      current.people += 1
      map.set(key, current)
    })
    return Array.from(map.entries())
      .map(([department, stats]) => ({ department, ...stats }))
      .sort((a, b) => b.hours - a.hours)
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <FiltersBar
        value={filters}
        onChange={setFilters}
        eventOptions={options.events}
        departmentOptions={options.departments}
        personOptions={options.persons}
        lineOptions={options.lines}
        collapsible
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiWorkersPerEvent summary={summary} />
        <KpiAssignmentsPerEvent summary={summary} />
        <KpiHoursReal summary={summary} />
        <KpiHoursTheoretical summary={summary} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {warnings.length > 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>[!] {w}</div>
          ))}
        </div>
      )}

      <TopHoursTable rows={topHours} />
      <DeptSummaryTable rows={deptAgg} />
    </div>
  )
}

function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const start = new Date(now)
  start.setDate(now.getDate() - (day - 1))
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}
