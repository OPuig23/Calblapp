// file: src/components/reports/vehicles/VehiclesPanel.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersBar, type Filters } from '@/components/reports/filters/FiltersBar'
import { KpiVehicles } from './KpiVehicles'
import { KpiTypes } from './KpiTypes'
import { KpiKm } from './KpiKm'
import { KpiCost } from './KpiCost'
import { VehiclesTable } from './VehiclesTable'
import { DriversTable } from './DriversTable'
import type { VehicleRow, DriverRow } from './types'

type FilterOptions = {
  events: Array<{ id: string; name: string }>
  lines: string[]
}

const defaultOptions: FilterOptions = { events: [], lines: [] }

export function VehiclesPanel() {
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
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [drivers, setDrivers] = useState<DriverRow[]>([])
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

      const res = await fetch(`/api/reports/vehicles?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error carregant informe')

      const vehicleRows: VehicleRow[] = (data.vehicles || []).map((v: any) => ({
        plate: v.plate || 'Sense matrícula',
        type: v.type || '',
        assignments: v.assignments || 0,
        events: Array.isArray(v.events) ? v.events.length : v.events?.size || 0,
        conductors: Array.isArray(v.conductors) ? v.conductors.length : v.conductors?.size || 0,
        distanceKm: Number(v.distanceKm || 0),
        cost: Number(v.cost || 0),
      }))

      const driverRows: DriverRow[] = (data.drivers || []).map((d: any) => ({
        name: d.name || 'Sense nom',
        assignments: d.assignments || 0,
        plates: Array.isArray(d.plates) ? d.plates.length : d.plates?.size || 0,
      }))

      setVehicles(vehicleRows)
      setDrivers(driverRows)
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setOptions(data.options || defaultOptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconegut')
      setWarnings([])
      setVehicles([])
      setDrivers([])
      setOptions(defaultOptions)
    }
  }, [filters])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const typeList = useMemo(() => {
    const set = new Set<string>()
    vehicles.forEach(v => v.type && set.add(v.type))
    return Array.from(set)
  }, [vehicles])

  const totalKm = useMemo(
    () => vehicles.reduce((acc, v) => acc + Number(v.distanceKm || 0), 0),
    [vehicles]
  )

  const totalCost = useMemo(
    () => vehicles.reduce((acc, v) => acc + Number(v.cost || 0), 0),
    [vehicles]
  )

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
        collapsible
      />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiVehicles count={vehicles.length} />
        <KpiKm value={totalKm} />
        <KpiCost value={totalCost} />
        <KpiTypes types={typeList} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      {warnings.length > 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>[!] {w}</div>
          ))}
        </div>
      )}

      <VehiclesTable rows={vehicles} />
      <DriversTable rows={drivers} />
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
