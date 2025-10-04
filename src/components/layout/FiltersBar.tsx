// filename: src/components/layout/FiltersBar.tsx
'use client'

import React, { useState, useCallback, memo } from 'react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { SlidersHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type FiltersState = {
  start: string
  end: string
  mode?: 'week' | 'day' | 'range'
  ln?: string
  responsable?: string
  location?: string
}

type FilterKey = 'ln' | 'responsable' | 'location'

export type FiltersBarProps = {
  filters: FiltersState
  setFilters: (f: Partial<FiltersState>) => void
  onReset?: () => void
  visibleFilters?: FilterKey[]
  hiddenFilters?: FilterKey[]
  lnOptions?: string[]
  responsables?: string[]
  locations?: string[]
}

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
  const [resetSignal, setResetSignal] = useState(0)

  const handleClearAll = useCallback(() => {
    setFilters({})
    setResetSignal((n) => n + 1)
    onReset?.()
  }, [setFilters, onReset])

  const handleDatesChange = useCallback(
    (f: SmartFiltersChange) => {
      if (f.start && f.end) setFilters({ start: f.start, end: f.end, mode: f.mode })
    },
    [setFilters]
  )

  const SelectsInline = memo(() => {
    const base = 'h-10 rounded-xl border bg-white text-gray-900 px-3'
    return (
      <>
        {visibleFilters.includes('ln') && (
          <select
            className={`${base} w-[150px]`}
            value={filters.ln ?? '__all__'}
            onChange={(e) => setFilters({ ln: e.target.value })}
            aria-label="Línia de negoci"
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
            aria-label="Responsable"
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
            aria-label="Ubicació"
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

  return (
    <div className="sticky top-[56px] z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      {/* ✅ Barra de filtres: una sola línia, scroll horitzontal suau */}
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto whitespace-nowrap px-2 py-2 sm:flex-nowrap">
        {/* 📅 Filtres de data (SmartFilters) */}
        <SmartFilters
          modeDefault="week"          // setmana actual per defecte
          role="Treballador"
          showDepartment={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          onChange={handleDatesChange}
          resetSignal={resetSignal}
        />

        {/* Filtres visibles en línia (opcionals) */}
        <SelectsInline />

        {/* ⚙️ Botó per obrir filtres avançats */}
        {hiddenFilters.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-xl border-gray-300 hover:bg-gray-100"
                title="Filtres avançats"
              >
                <SlidersHorizontal className="h-5 w-5 text-gray-700" />
              </Button>
            </DialogTrigger>

            {/* 📱 Modal optimitzat per a mòbil */}
            <DialogContent className="fixed bottom-0 left-0 right-0 h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white p-5 shadow-xl sm:static sm:h-auto sm:max-w-lg sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Filtres avançats
                </DialogTitle>
              </DialogHeader>

              <div className="mt-3 flex flex-col gap-3">
                {hiddenFilters.includes('ln') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">🌐 LN</label>
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

                {hiddenFilters.includes('responsable') && (
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

                {hiddenFilters.includes('location') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-600">📍 Ubicació</label>
                    <select
                      className="h-10 rounded-xl border bg-white px-3"
                      value={filters.location ?? '__all__'}
                      onChange={(e) => setFilters({ location: e.target.value })}
                    >
                      <option value="__all__">Totes</option>
                      {locations.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 🔄 Botó de reinici dins del modal (LAND-007-F.2) */}
                <Button
                  variant="outline"
                  className="mt-4 w-full text-gray-700 border-gray-300"
                  onClick={handleClearAll}
                >
                  ↻ Reiniciar filtres
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
