// file: src/components/layout/FiltersBar.tsx
'use client'

import React, { useState, useCallback, memo } from 'react'
import { usePathname } from 'next/navigation'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { useFilters } from '@/context/FiltersContext'
import ResetFilterButton from '@/components/ui/ResetFilterButton'
import FilterButton from '@/components/ui/filter-button'

/* ──────────────────────────────
   Tipus i props
────────────────────────────── */
export type FiltersState = {
  start: string
  end: string
  mode?: 'week' | 'day' | 'range'
  ln?: string
  responsable?: string
  location?: string
  status?: string // nou: estat (pending / draft / confirmed)
}

type FilterKey = 'ln' | 'responsable' | 'location'

export type FiltersBarProps = {
  id?: string
  filters: FiltersState
  setFilters: (f: Partial<FiltersState>) => void
  onReset?: () => void
  visibleFilters?: FilterKey[]
  hiddenFilters?: FilterKey[]
  lnOptions?: string[]
  responsables?: string[]
  locations?: string[]
}

/* ──────────────────────────────
   Component principal
────────────────────────────── */
export default function FiltersBar({
  filters,
  setFilters,
  onReset,
  visibleFilters = [],
  hiddenFilters = ['ln', 'responsable', 'location'],
  lnOptions = [],
  responsables = [],
  locations = [],
}: FiltersBarProps) {
  const pathname = usePathname()
  const isQuadrants = pathname?.startsWith('/menu/quadrants')
  const { setOpen, setContent } = useFilters()

  const [resetSignal, setResetSignal] = useState(0)

  /* ─── Gestor dates (SmartFilters compacte de setmana) ───────────── */
  const handleDatesChange = useCallback(
    (f: SmartFiltersChange) => {
      if (f.start) {
        const base = new Date(f.start)
        const weekStart = startOfWeek(base, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(base, { weekStartsOn: 1 })
        setFilters({
          start: format(weekStart, 'yyyy-MM-dd'),
          end: format(weekEnd, 'yyyy-MM-dd'),
          mode: 'week',
        })
      }
    },
    [setFilters]
  )

  /* ─── Selects inline (si algun mòdul els vol mostrar) ───────────── */
  const SelectsInline = memo(() => {
    const base = 'h-10 rounded-xl border bg-white text-gray-900 px-3'
    return (
      <>
        {visibleFilters.includes('ln') && (
          <select
            className={`${base} w-[150px]`}
            value={filters.ln ?? '__all__'}
            onChange={(e) => setFilters({ ln: e.target.value })}
          >
            <option value="__all__">LN: Totes</option>
            {lnOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}

        {visibleFilters.includes('responsable') && (
          <select
            className={`${base} w-[180px]`}
            value={filters.responsable ?? '__all__'}
            onChange={(e) => setFilters({ responsable: e.target.value })}
          >
            <option value="__all__">Resp: Tots</option>
            {responsables.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}

        {visibleFilters.includes('location') && (
          <select
            className={`${base} w-[170px]`}
            value={filters.location ?? '__all__'}
            onChange={(e) => setFilters({ location: e.target.value })}
          >
            <option value="__all__">Ubicació: Totes</option>
            {locations.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
      </>
    )
  })

  /* ─── PANTALLA ───────────── */
  return (
    <div className="sticky top-[56px] z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 overflow-x-auto whitespace-nowrap px-2 py-[3px] sm:flex-nowrap">
        {/* 📅 Selector compacte de Setmana (només dates) */}
        <SmartFilters
          modeDefault="week"
          role="Treballador"
          showDepartment={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          onChange={handleDatesChange}
          resetSignal={resetSignal}
        />

        {/* Selects inline opcionals */}
        

        {/* 🔘 Botó de filtres (slide lateral) */}
        <FilterButton
          onClick={() => {
            setContent(
              <div className="p-4 flex flex-col gap-4">
                {/* 🌐 LN */}
                {lnOptions?.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">
                      🌐 Línia de Negoci
                    </label>
                    <select
                      className="h-10 rounded-xl border bg-white px-3"
                      value={filters.ln ?? '__all__'}
                      onChange={(e) => setFilters({ ln: e.target.value })}
                    >
                      <option value="__all__">Totes</option>
                      {lnOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 📌 Estat – NOMÉS a Quadrants */}
                {isQuadrants && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">📌 Estat</label>
                    <select
                      className="h-10 rounded-xl border bg-white px-3"
                      value={filters.status ?? '__all__'}
                      onChange={(e) => setFilters({ status: e.target.value })}
                    >
                      <option value="__all__">Tots</option>
                      <option value="pending">Pendents</option>
                      <option value="draft">Esborranys</option>
                      <option value="confirmed">Confirmats</option>
                    </select>
                  </div>
                )}

                {/* 👤 Responsable */}
                {responsables && responsables.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">👤 Responsable</label>
                    <select
                      className="h-10 rounded-xl border bg-white px-3"
                      value={filters.responsable ?? '__all__'}
                      onChange={(e) => setFilters({ responsable: e.target.value })}
                    >
                      <option value="__all__">Tots</option>
                      {responsables.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 📍 Ubicació */}
                {locations?.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">📍 Ubicació</label>
                    <select
                    
  className="h-10 rounded-xl border bg-white px-3"
  value={filters.location ?? '__all__'}
  onChange={(e) => setFilters({ location: e.target.value })} 
>
  <option value="__all__">Totes</option>
  {locations.map((o) => (
    <option key={o} value={o}>{o}</option>
  ))}
</select>

                  </div>
                )}

                {/* 🔄 Botó reset */}
                <div className="flex gap-2 pt-4">
                  <ResetFilterButton
                    onClick={() => {
                      setFilters({
                        ln: '__all__',
                        responsable: '__all__',
                        location: '__all__',
                        status: '__all__',
                      })
                      setResetSignal((v) => v + 1)
                      onReset?.()
                    }}
                  />
                </div>
              </div>
            )

            setOpen(true)
          }}
        />
      </div>
    </div>
  )
}
