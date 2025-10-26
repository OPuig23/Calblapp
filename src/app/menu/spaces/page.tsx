//file: src/app/menu/spaces/page.tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSpaces } from '@/hooks/spaces/useSpaces'
import SpaceGrid from '@/components/spaces/SpaceGrid'
import SidePanel from '@/components/spaces/SidePanel'
import { SpacesFilterState } from '@/components/spaces/SpacesFilters'

export default function SpacesPage() {
  const [isPanelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState<SpacesFilterState>({
    stage: 'all',
    finca: '',
    comercial: '',
    baseDate: new Date().toISOString().split('T')[0],
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  })

  const { spaces, totals, loading } = useSpaces(filters)

  /** 🔹 Mou la setmana enrere o endavant */
  const shiftWeek = (direction: 'prev' | 'next') => {
    const base = new Date(filters.baseDate || new Date())
    base.setDate(base.getDate() + (direction === 'next' ? 7 : -7))
    setFilters(prev => ({
      ...prev,
      baseDate: base.toISOString().split('T')[0],
      month: base.getMonth(),
      year: base.getFullYear(),
    }))
  }

  /** 🔹 Etiqueta de setmana (ex. 21/10 — 27/10) */
  const weekLabel = (() => {
    const base = new Date(filters.baseDate || new Date())
    const monday = new Date(base)
    const dow = monday.getDay() || 7
    if (dow !== 1) monday.setDate(monday.getDate() - (dow - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const f = (d: Date) => d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })
    return `${f(monday)} — ${f(sunday)}`
  })()

  return (
    <section className="relative w-full h-full bg-white">
      {/* Botó menú lateral */}
      <button
        onClick={() => setPanelOpen(true)}
        className="fixed top-[4.5rem] left-3 z-50 bg-white/95 rounded-full shadow-md px-3 py-1 text-2xl sm:text-xl active:scale-95 transition"
        title="Obrir filtres i opcions"
      >
        ≡
      </button>

      <SidePanel
        open={isPanelOpen}
        onClose={() => setPanelOpen(false)}
        onApply={(newFilters) => {
          setFilters(prev => ({
            ...prev,
            ...newFilters,
            finca: newFilters.finca?.split('(')[0].trim() || '',
          }))
          setPanelOpen(false)
        }}
      />

      {loading ? (
        <motion.div
          className="mt-10 flex flex-col gap-3 items-center"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1.2, repeatType: 'reverse' }}
        >
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-60 bg-gray-100 rounded" />
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3 mt-4 mb-2">
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

          <SpaceGrid data={spaces} totals={totals} baseDate={filters.baseDate} />
        </>
      )}
    </section>
  )
}
