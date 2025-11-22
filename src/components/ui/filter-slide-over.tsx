//file: src/components/ui/filter-slide-over.tsx
'use client'

import React from 'react'
import { useFilters } from '@/context/FiltersContext'

export default function FilterSlideOver() {
  const { open, setOpen, content } = useFilters()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Fons fosc */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setOpen(false)}
      />

      {/* Panell dret */}
      <div className="w-80 max-w-[80vw] h-full bg-white shadow-xl border-l flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-800">Filtres</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {content || (
            <p className="p-4 text-sm text-gray-400">
              No hi ha filtres definits per aquesta pantalla.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
