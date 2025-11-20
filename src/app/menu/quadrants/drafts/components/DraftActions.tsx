// file: src/app/menu/quadrants/drafts/components/DraftActions.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Save, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react'

export default function DraftActions({
  confirmed,
  confirming,
  dirty,
  onConfirm,
  onUnconfirm,
  onSave,
  onDelete,
}: {
  confirmed: boolean
  confirming: boolean
  dirty: boolean
  onConfirm: () => void
  onUnconfirm: () => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

      {/* Confirmar */}
      <Button
        size="sm"
        className={`rounded-full ${
          confirmed ? 'bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600'
        } text-white shadow`}
        onClick={onConfirm}
        disabled={confirming || confirmed}
        title={confirmed ? 'Quadrant confirmat' : 'Confirmar quadrant'}
      >
       <CheckCircle2 className="w-5 h-5" />

      </Button>

      {/* Reobrir */}
      <Button
        size="sm"
        className="rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow"
        onClick={onUnconfirm}
        disabled={!confirmed || confirming}
        title="Reobrir quadrant"
      >
        <RotateCcw size={18} />
      </Button>

      {/* Desa */}
      <Button
        size="sm"
        className={`rounded-full ${
          dirty && !confirmed
            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        onClick={onSave}
        disabled={!dirty || confirmed}
        title="Desa canvis"
      >
        <Save size={18} />
      </Button>

      {/* Eliminar */}
      <Button
        size="sm"
        className="rounded-full bg-red-600 hover:bg-red-700 text-white shadow"
        onClick={onDelete}
        title="Elimina quadrant"
      >
        <Trash2 size={18} />
      </Button>
    </div>
  )
}
