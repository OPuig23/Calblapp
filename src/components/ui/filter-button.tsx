//file: src/components/ui/filter-button.tsx
'use client'

import { useFilters } from '@/context/FiltersContext'

export default function FilterButton({ onClick }: { onClick?: () => void }) {
  const { setOpen } = useFilters()

  return (
    <button
      className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-300 bg-white hover:bg-gray-100"
      onClick={() => {
        if (onClick) onClick()
        setOpen(true)
      }}
      title="Filtres"
    >
      {/* Icona hamburguer IDENTICA a Torns */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-700"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 12h12M10 20h4" />
      </svg>
    </button>
  )
}
