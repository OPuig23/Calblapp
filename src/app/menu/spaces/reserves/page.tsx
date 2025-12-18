// file: src/app/menu/spaces/reserves/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

import { useSpaces } from '@/hooks/spaces/useSpaces'
import SpaceGrid from '@/components/spaces/SpaceGrid'
import ModuleHeader from '@/components/layout/ModuleHeader'

import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'
import SpacesFilters from '@/components/spaces/SpacesFilters'

export default function SpacesPage() {

  // -------------------------------
  // 🔹 Estat de filtres
  // -------------------------------
  const [filters, setFilters] = useState({
    stage: 'all',
    finca: '',
    comercial: '',
    ln: '',
    baseDate: new Date().toISOString().split('T')[0],  // Setmana inicial
  })

  // -------------------------------
  // 🔹 Carrega dades segons filtres
  // -------------------------------
const {
  spaces,
  totals,
  fincas,
  comercials,
  lns,        // ✅ AFEGIT
  loading
} = useSpaces(filters)


  // -------------------------------
  // 🔹 Control del panell de filtres
  // -------------------------------
  const { setOpen: openFilters, setContent: setFiltersContent } = useFilters()

  // -------------------------------
  // 🔹 Canvi de setmana
  // -------------------------------
  const shiftWeek = (direction: 'prev' | 'next') => {
    const base = new Date(filters.baseDate)
    base.setDate(base.getDate() + (direction === 'next' ? 7 : -7))

    setFilters(prev => ({
      ...prev,
      baseDate: base.toISOString().split('T')[0]
    }))
  }

  // -------------------------------
  // 🔹 Etiqueta setmana
  // -------------------------------
  const weekLabel = (() => {
    const base = new Date(filters.baseDate)
    const monday = new Date(base)
    const dow = monday.getDay() || 7
    if (dow !== 1) monday.setDate(monday.getDate() - (dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const f = (d: Date) =>
      d.toLocaleDateString('ca-ES', {
        day: '2-digit',
        month: '2-digit'
      })

    return `${f(monday)} — ${f(sunday)}`
  })()

  // -------------------------------
  // 🔹 Render
  // -------------------------------
  return (
    <>
      {/* Capçalera general */}
      <ModuleHeader
        title="Espais / Reserves"
        subtitle="Disponibilitat setmanal de finques"
      />

      <section className="relative w-full h-full bg-white">

        {/* ───────────────────────────────
             📅 Controls de setmana + Filtres
           ─────────────────────────────── */}
        <div className="flex items-center justify-between mt-4 mb-2 px-4">

          {/* Controls esquerra */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => shiftWeek('prev')}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              ◀
            </button>

            <span className="font-semibold text-gray-700 text-sm sm:text-base">
              Setmana: {weekLabel}
            </span>

            <button
              onClick={() => shiftWeek('next')}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
            >
              ▶
            </button>
          </div>

          {/* Botó filtres */}
          <FilterButton
            onClick={() => {
              setFiltersContent(
                <SpacesFilters
                  fincas={fincas}
                  comercials={comercials}
                  lns={lns} 
                  onChange={(patch) =>
                    setFilters(prev => ({
                      ...prev,
                      ...patch
                    }))
                  }
                />
              )
              openFilters(true)
            }}
          />
        </div>

        {/* ───────────────────────────────
             ⏳ Loading
           ─────────────────────────────── */}
        {loading && (
          <motion.div
            className="mt-10 flex flex-col gap-3 items-center"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.2, repeatType: 'reverse' }}
          >
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-60 bg-gray-100 rounded" />
          </motion.div>
        )}

        {/* ───────────────────────────────
             🧩 Taula de dades
           ─────────────────────────────── */}
        {!loading && (
          <SpaceGrid
            data={spaces}
            totals={totals}
            baseDate={filters.baseDate}
          />
        )}

      </section>
    </>
  )
}
