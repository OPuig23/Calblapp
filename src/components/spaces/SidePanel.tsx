//file: src/components/spaces/SidePanel.tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import SpacesFilters, { SpacesFilterState } from './SpacesFilters'
import { Button } from '@/components/ui/button'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  onApply: (filters: SpacesFilterState) => void   // 👈 afegeix aquesta línia
}


export default function SidePanel({ open, onClose, onApply }: SidePanelProps) {

  const [pendingFilters, setPendingFilters] = useState<SpacesFilterState | null>(null)

const applyFilters = () => {
  if (pendingFilters) {
    console.log('✅ Filtres aplicats:', pendingFilters)
    onApply(pendingFilters)   // ✅ <--- aquesta línia envia els filtres reals al page.tsx
  }
  onClose()
}


  const resetFilters = () => {
    setPendingFilters(null)
    console.log('🔄 Filtres reiniciats')
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

      {/* 🔹 Botons d'acció */}
      <div className="flex justify-between mt-6 border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          className="text-gray-600 hover:text-gray-800"
          onClick={resetFilters}
        >
          Reinicia
        </Button>
        <Button
          variant="default"
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={applyFilters}
        >
          Aplica filtres
        </Button>
      </div>
    </motion.aside>
  )
}
