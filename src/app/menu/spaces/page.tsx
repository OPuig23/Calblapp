//file: src/app/menu/spaces/page.tsx
'use client'

import { useState } from 'react'
import { useSpaces } from '@/hooks/spaces/useSpaces'
import SpaceGrid from '@/components/spaces/SpaceGrid'
import SidePanel from '@/components/spaces/SidePanel'
import { SpacesFilterState } from '@/components/spaces/SpacesFilters'

export default function SpacesPage() {
  const [isPanelOpen, setPanelOpen] = useState(false)
  const [filters, setFilters] = useState<SpacesFilterState>({
    stage: 'all',
    finca: '',
  })

  const { spaces, weekLabel, loading } = useSpaces(filters) // 🔹 filtres passats al hook

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

      {/* Panell lateral amb filtres */}
      <SidePanel
        open={isPanelOpen}
        onClose={() => setPanelOpen(false)}
        onApply={(newFilters) => {
          setFilters(newFilters)
          setPanelOpen(false)
        }}
      />

      {loading ? (
        <p className="text-center mt-20 text-gray-500">Carregant disponibilitat…</p>
      ) : (
        <SpaceGrid
  data={spaces}
  weekLabel={weekLabel}
  baseDate={filters.start}  // 🔹 passem la data triada
/>

      )}
    </section>
  )
}
