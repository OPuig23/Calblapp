'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type PhaseCardProps = {
  label: string
  description?: string
  selected: boolean
  visible: boolean
  onToggleSelection: () => void
  onToggleVisibility: () => void
  children: ReactNode
}

export default function PhaseCard({
  label,
  description,
  selected,
  visible,
  onToggleSelection,
  onToggleVisibility,
  children,
}: PhaseCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        visible ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={onToggleSelection}
          >
            {selected ? 'Inclosa' : 'No inclosa'}
          </Button>
          <Button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              visible ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={onToggleVisibility}
          >
            {visible ? 'Amaga' : 'Mostra'}
          </Button>
        </div>
      </div>
      {visible && children ? <div className="space-y-3 mt-4">{children}</div> : null}
    </div>
  )
}
