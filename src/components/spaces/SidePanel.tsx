//file: src/components/spaces/SidePanel.tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import SpacesFilters, { SpacesFilterState } from './SpacesFilters'
import { Button } from '@/components/ui/button'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  onApply: (filters: SpacesFilterState) => void
}

export default function SidePanel({ open, onClose, onApply }: SidePanelProps) {
  const [pendingFilters, setPendingFilters] = useState<SpacesFilterState | null>(null)

  /** ✅ Aplica filtres al pare */
  const applyFilters = () => {
  if (!pendingFilters) return
  // 🔹 Si el filtre no porta baseDate, mantenim el de l'última vista
  const filtersWithBase = {
    ...pendingFilters,
    baseDate: pendingFilters.baseDate || new Date().toISOString().split('T')[0],
  }
  onApply(filtersWithBase)
  onClose()
}


  /** 🧹 Reinicia filtres */
  const resetFilters = () => {
    const reset: SpacesFilterState = {
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      finca: '',
      comercial: '',
      baseDate: new Date().toISOString().split('T')[0],
    }
    onApply(reset)
    onClose()
  }

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: open ? 0 : '100%' }}
      transition={{ type: 'spring', stiffness: 70 }}
      className="fixed top-0 right-0 h-full w-[90vw] sm:w-3/4 bg-white shadow-lg z-50 p-4 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-gray-700 text-lg">Filtres</h2>
        <button onClick={onClose} className="text-xl">✕</button>
      </div>

      <SpacesFilters onChange={(f) => setPendingFilters(f)} />

      <div className="flex justify-between mt-6 border-t pt-3">
        <Button variant="outline" size="sm" onClick={resetFilters}>
          Neteja filtres
        </Button>
        <Button variant="default" size="sm" className="bg-blue-600 text-white" onClick={applyFilters}>
          Actualitza vista
        </Button>
      </div>
    </motion.aside>
  )
}
