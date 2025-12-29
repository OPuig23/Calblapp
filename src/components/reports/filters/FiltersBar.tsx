// file: src/components/reports/filters/FiltersBar.tsx
'use client'

import { useRef, useState } from 'react'
import { Filter } from 'lucide-react'
import SmartFilters, { type SmartFiltersChange } from '@/components/filters/SmartFilters'

export type Filters = {
  start: string
  end: string
  department: string
  event: string
  person: string
  line: string
}

type Props = {
  value: Filters
  onChange: (next: Filters) => void
  departmentOptions?: string[]
  eventOptions?: Array<{ id: string; name: string }>
  personOptions?: string[]
  lineOptions?: string[]
  collapsible?: boolean
}

export function FiltersBar({
  value,
  onChange,
  departmentOptions = [],
  eventOptions = [],
  personOptions = [],
  lineOptions = [],
  collapsible = false,
}: Props) {
  // Fixar els valors inicials per no provocar loops amb SmartFilters
  const initialStartRef = useRef(value.start)
  const initialEndRef = useRef(value.end)
  const lastDateRef = useRef<{ start: string; end: string }>({
    start: value.start,
    end: value.end,
  })
  const [open, setOpen] = useState(false)

  const update = (partial: Partial<Filters>) => {
    const next = { ...value, ...partial }
    const changed = Object.keys(next).some(k => (next as any)[k] !== (value as any)[k])
    if (changed) onChange(next)
  }

  const handleDates = (f: SmartFiltersChange) => {
    if (!f.start || !f.end) return
    if (f.start === lastDateRef.current.start && f.end === lastDateRef.current.end) return
    lastDateRef.current = { start: f.start, end: f.end }
    onChange({ ...value, start: f.start, end: f.end })
  }

  const panelClass = collapsible
    ? `${open ? 'block' : 'hidden'} sm:block`
    : ''

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 sm:hidden"
        >
          <Filter className="w-4 h-4" />
          {open ? 'Amaga filtres' : 'Mostra filtres'}
        </button>
      )}

      <div className={panelClass}>
        <SmartFilters
          role="admin"
          onChange={handleDates}
          showDepartment={false}
          showCommercial={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          showImportance={false}
          showAdvanced={false}
          compact
          initialStart={initialStartRef.current}
          initialEnd={initialEndRef.current}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 md:mt-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Departament</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm bg-white"
              value={value.department}
              onChange={e => update({ department: e.target.value })}
            >
              <option value="">Tots</option>
              {departmentOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Esdeveniment (codi/nom)</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm bg-white"
              value={value.event}
              onChange={e => update({ event: e.target.value })}
            >
              <option value="">Tots</option>
              {eventOptions.map(opt => {
                const label =
                  opt.name && opt.name !== opt.id ? `${opt.id} - ${opt.name}` : opt.id || opt.name || '(sense nom)'
                return (
                  <option key={opt.id} value={opt.id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Persona</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm bg-white"
              value={value.person}
              onChange={e => update({ person: e.target.value })}
            >
              <option value="">Totes</option>
              {personOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Línia de negoci</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm bg-white"
              value={value.line}
              onChange={e => update({ line: e.target.value })}
            >
              <option value="">Totes</option>
              {lineOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
