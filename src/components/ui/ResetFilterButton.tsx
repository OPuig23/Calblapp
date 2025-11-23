// filename: src/components/ui/ResetFilterButton.tsx
'use client'

import { RotateCcw } from 'lucide-react'

export default function ResetFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="
        p-2 
        h-10 
        w-10
        flex
        items-center 
        justify-center
        rounded-xl 
        border 
        border-gray-300 
        text-gray-600 
        hover:bg-gray-50
        active:scale-95
        transition
      "
    >
      <RotateCcw className="h-5 w-5" />
    </button>
  )
}
