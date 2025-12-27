// file: src/components/reports/financial/FinancialPanel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersBar, type Filters } from '@/components/reports/filters/FiltersBar'
import { KpiRevenue } from './KpiRevenue'
import { KpiCost } from './KpiCost'
import { KpiMargin } from './KpiMargin'
import { KpiMarginPct } from './KpiMarginPct'
import { LnMarginTable } from './LnMarginTable'
import { EventMarginTable } from './EventMarginTable'
import type { FinancialEvent, FinancialSummary } from './types'

const COST_PER_HOUR = 18

type FilterOptions = {
  events: Array<{ id: string; name: string }>
  lines: string[]
}

const defaultOptions: FilterOptions = { events: [], lines: [] }

export function FinancialPanel() {
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
  const [rows, setRows] = useState<FinancialEvent[]>([])
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

      const res = await fetch(`/api/reports/financial?${params.toString()}`, { cache: 'no-store' })
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

  const summary: FinancialSummary = useMemo(() => {
    const revenue = rows.reduce((acc, r) => acc + Number(r.importTotal || 0), 0)
    const hours = rows.reduce((acc, r) => acc + Number(r.hours || 0), 0)
    const cost = hours * COST_PER_HOUR
    const margin = revenue - cost
    const marginPct = revenue ? (margin / revenue) * 100 : 0
    const revenuePerEvent = rows.length ? revenue / rows.length : 0
    return { revenue, cost, margin, marginPct, revenuePerEvent }
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto -mx-1 px-1">
        <FiltersBar
          value={filters}
          onChange={setFilters}
          eventOptions={options.events}
          departmentOptions={[]}
          personOptions={[]}
          lineOptions={options.lines}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiRevenue value={summary.revenue} />
        <KpiCost value={summary.cost} />
        <KpiMargin value={summary.margin} />
        <KpiMarginPct value={summary.marginPct} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {warnings.length > 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>[!] {w}</div>
          ))}
        </div>
      )}

      <LnMarginTable data={rows} costPerHour={COST_PER_HOUR} />
      <EventMarginTable data={rows} costPerHour={COST_PER_HOUR} />
    </div>
  )
}

function getISO(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
