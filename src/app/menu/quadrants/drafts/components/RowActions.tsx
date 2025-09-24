//file:src\app\menu\quadrants\drafts\components\RowActions.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'

export default function RowActions({ onEdit, onDelete, disabled }: { 
  onEdit: () => void
  onDelete: () => void
  disabled: boolean
}) {
  return (
    <div className="ml-2 flex items-center justify-end gap-1">
      <Button size="icon" variant="outline" onClick={onEdit} disabled={disabled}>
        <Edit size={16} />
      </Button>
      <Button size="icon" variant="ghost" onClick={onDelete} disabled={disabled}>
        <Trash2 size={16} />
      </Button>
    </div>
  )
}
