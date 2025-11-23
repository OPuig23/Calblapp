// file: src/components/spaces/SpacesFilters.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ResetFilterButton from '@/components/ui/ResetFilterButton'

/** Tipus de filtres del mòdul d'espais */
export interface SpacesFilterState {
  stage?: 'verd' | 'taronja' | 'all'
  finca?: string
  comercial?: string
}

interface SpacesFiltersProps {
  fincas: string[]        // Llista real de finques (prové de useSpaces)
  comercials: string[]    // Llista real de comercials (prové de useSpaces)
  onChange: (patch: SpacesFilterState) => void
}

export default function SpacesFilters({
  fincas,
  comercials,
  onChange
}: SpacesFiltersProps) {

  const [filters, setFilters] = useState<SpacesFilterState>({
    stage: 'all',
    finca: '',
    comercial: '',
  })

  /** 🔁 Cada canvi de filtre s'envia automàticament al pare */
  useEffect(() => {
    onChange(filters)
  }, [filters, onChange])

  /** 🔄 Reiniciar filtres */
  const resetAll = () => {
    setFilters({
      stage: 'all',
      finca: '',
      comercial: '',
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 w-full border-b pb-3 px-2"
    >

      {/* 🎨 Estat */}
      <select
        value={filters.stage || 'all'}
        onChange={e =>
          setFilters(prev => ({
            ...prev,
            stage: e.target.value as any
          }))
        }
        className="border rounded-md px-2 py-2 text-sm bg-white w-full"
      >
        <option value="all">🎨 Tots els estats</option>
        <option value="verd">✅ Confirmats</option>
        <option value="taronja">🟧 Pendents</option>
      </select>

      {/* 🏡 Finca */}
      <select
        value={filters.finca || ''}
        onChange={e =>
          setFilters(prev => ({
            ...prev,
            finca: e.target.value,
            comercial: ''          // Reinicialitzar comercial si canviem finca
          }))
        }
        className="border rounded-md px-2 py-2 text-sm bg-white w-full"
      >
        <option value="">🌐 Totes les finques</option>

        {fincas.length === 0 && (
          <option disabled>No hi ha finques disponibles</option>
        )}

        {fincas.map(f => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* 👤 Comercial */}
      <select
        value={filters.comercial || ''}
        onChange={e =>
          setFilters(prev => ({
            ...prev,
            comercial: e.target.value
          }))
        }
        className="border rounded-md px-2 py-2 text-sm bg-white w-full"
      >
        <option value="">👤 Tots els comercials</option>

        {comercials.length === 0 && (
          <option disabled>No hi ha comercials disponibles</option>
        )}

        {comercials.map(nom => (
          <option key={nom} value={nom}>
            {nom}
          </option>
        ))}
      </select>

      {/* 🔄 Botó reiniciar filtres */}
      <div className="flex justify-end mt-4">
        <ResetFilterButton onClick={resetAll} />
      </div>
    </motion.div>
  )
}
