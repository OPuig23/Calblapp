/// file: src/components/ui/filter-button.tsx
'use client'

import React from 'react'
import { useFilters } from '@/context/FiltersContext'

export default function FilterButton({ onClick }: { onClick?: () => void }) {
  const { setOpen } = useFilters()

  return (
    <button
      onClick={() => {
        if (onClick) onClick()   // primer executa el contingut personalitzat
        else setOpen(true)       // fallback per si no reps onClick
        setOpen(true)            // assegura que el slide s’obre sempre
      }}
      className="
        fixed
        right-10
        top-[95px]
        z-[55]
        h-10 w-10
        rounded-full
        border border-gray-200
        bg-white
        shadow-md
        flex items-center justify-center
        hover:bg-gray-100
        active:scale-95
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-700"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
      </svg>
    </button>
  )
}
