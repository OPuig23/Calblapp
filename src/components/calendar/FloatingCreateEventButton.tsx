// file: src/components/calendar/FloatingCreateEventButton.tsx
'use client'

import { Plus } from 'lucide-react'

export default function FloatingCreateEventButton() {
  return (
    <button
      type="button"
      aria-label="Crear nou esdeveniment"
      className="
        fixed bottom-20 right-4 z-30
        sm:hidden
        inline-flex items-center justify-center
        h-12 w-12 rounded-full
        bg-blue-600 text-white
        shadow-lg shadow-blue-300/60
        active:scale-95
        transition-transform
      "
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
