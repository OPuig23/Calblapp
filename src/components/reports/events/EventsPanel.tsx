// file: src/components/reports/events/EventsPanel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersBar, type Filters } from '@/components/reports/filters/FiltersBar'
import { KpiEventsCount } from './KpiEventsCount'
import { KpiAvgPax } from './KpiAvgPax'
import { KpiLnShare } from './KpiLnShare'
import { KpiTopCommercial } from './KpiTopCommercial'
import { LocationsTable } from './LocationsTable'
import { CommercialsTable } from './CommercialsTable'
import type { EventRow, EventSummary } from './types'

type FilterOptions = {
  events: Array<{ id: string; name: string; ln?: string }>
  lines: string[]
  commercials: string[]
}

const defaultOptions: FilterOptions = { events: [], lines: [], commercials: [] }

export function EventsPanel() {
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
  const [rows, setRows] = useState<EventRow[]>([])
  const [options, setOptions] = useState<FilterOptions>(defaultOptions)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const params = new URLSearchParams({
        start: filters.start,
        end: filters.end,
      })
      if (filters.event.trim()) params.set('event', filters.event.trim())
      if (filters.line.trim()) params.set('line', filters.line.trim())

      const res = await fetch(`/api/reports/events?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error carregant informe')
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setRows(data.data || [])
      setOptions(data.options || defaultOptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconegut')
      setWarnings([])
      setRows([])
      setOptions(defaultOptions)
    }
  }, [filters])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const summary: EventSummary = useMemo(() => {
    const totalEvents = rows.length
    const totalPax = rows.reduce((acc, r) => acc + Number(r.pax || 0), 0)
    const lnMap = new Map<string, number>()
    rows.forEach(r => {
      const key = r.ln || 'Sense LN'
      lnMap.set(key, (lnMap.get(key) || 0) + 1)
    })
    const lnShare = Array.from(lnMap.entries())
      .map(([ln, count]) => ({ ln, count }))
      .sort((a, b) => b.count - a.count)

    const comMap = new Map<string, number>()
    rows.forEach(r => {
      const key = r.commercial || 'Sense comercial'
      comMap.set(key, (comMap.get(key) || 0) + 1)
    })
    const topCommercialEntry = Array.from(comMap.entries()).sort((a, b) => b[1] - a[1])[0]
    const topCommercial =
      topCommercialEntry && topCommercialEntry[1] > 0
        ? { name: topCommercialEntry[0], events: topCommercialEntry[1] }
        : undefined

    return {
      totalEvents,
      avgPax: totalEvents ? totalPax / totalEvents : 0,
      lnShare,
      topCommercial,
    }
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <FiltersBar
        value={filters}
        onChange={setFilters}
        eventOptions={options.events}
        departmentOptions={[]}
        personOptions={[]}
        lineOptions={options.lines}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiEventsCount total={summary.totalEvents} />
        <KpiAvgPax avg={summary.avgPax} />
        <KpiLnShare summary={summary} />
        <KpiTopCommercial summary={summary} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {warnings.length > 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>[!] {w}</div>
          ))}
        </div>
      )}

      <LocationsTable data={rows} />
      <CommercialsTable data={rows} />
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
