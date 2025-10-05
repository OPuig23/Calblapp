// file: src/components/layout/FiltersBar.tsx
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
  const [resetSignal, setResetSignal] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  /* ─── Gestors ───────────────────── */
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

// ✅ Aplica filtres seleccionats i tanca modal
const handleApplyFilters = () => {
  setFilters({
    ln: filters.ln ?? '__all__',
    responsable: filters.responsable ?? '__all__',
    location: filters.location ?? '__all__',
  })
  setIsModalOpen(false)
}

  // ✅ Reinicia filtres, torna a setmana actual i tanca modal
const handleResetAndClose = () => {
  const today = new Date()
  const first = new Date(today)
  first.setDate(today.getDate() - today.getDay() + 1) // dilluns
  const last = new Date(first)
  last.setDate(first.getDate() + 6) // diumenge

  const isoStart = first.toISOString().slice(0, 10)
  const isoEnd = last.toISOString().slice(0, 10)

  setFilters({
    start: isoStart,
    end: isoEnd,
    mode: 'week',
    ln: '',
    responsable: '',
    location: '',
  })

  setResetSignal((n) => n + 1)
  onReset?.()

  setTimeout(() => setIsModalOpen(false), 150)
}


  /* ─── Selects inline ─────────────── */
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
              <option key={o} value={o}>{o}</option>
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
              <option key={o} value={o}>{o}</option>
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
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
      </>
    )
  })

  /* ─── Render principal ───────────── */
  return (
    <div className="sticky top-[56px] z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto whitespace-nowrap px-2 py-[3px] sm:flex-nowrap">
        {/* 📅 Filtres de data */}
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

        {/* Selects visibles */}
        <SelectsInline />

        {/* ⚙️ Botó filtres avançats */}
        {hiddenFilters.length > 0 && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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

            {/* 📱 Modal centrat i responsive */}
            <DialogContent key={resetSignal} className="max-w-lg w-[92vw] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-gray-800 text-center">
                  Filtres avançats
                </DialogTitle>
              </DialogHeader>

              <div className="mt-3 flex flex-col gap-3 pb-6 w-full">
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
                        <option key={o} value={o}>{o}</option>
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
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ─── Botons d'acció ───────────────────── */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 text-gray-700 border-gray-300"
                    onClick={handleResetAndClose}
                  >
                    ↻ Reiniciar filtres
                  </Button>

                  <Button
                    variant="default"
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleApplyFilters}
                  >
                    ✅ Aplica filtres
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
