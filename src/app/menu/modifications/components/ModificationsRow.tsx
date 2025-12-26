// file: src/app/menu/modifications/components/ModificationsRow.tsx
'use client'

import React, { useState } from 'react'
import { Modification } from '@/hooks/useModifications'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  mod: Modification
  onUpdate: (id: string, data: Partial<Modification>) => Promise<any> | void
}

export default function ModificationsRow({ mod, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftDesc, setDraftDesc] = useState(mod.description || '')

  const save = async () => {
    await onUpdate(mod.id, { description: draftDesc })
    setIsEditing(false)
  }

  return (
    <tr
      className="border-b last:border-0 hover:bg-slate-50"
      onClick={() => {
        if (!isEditing) setIsEditing(true)
      }}
    >
      <td className="p-2">
        <span className="text-[11px] font-mono tracking-tight block max-w-[90px] truncate">
          {mod.modificationNumber || '—'}
        </span>
      </td>
      <td className="p-2 truncate text-blue-700 font-medium">{mod.createdBy || '—'}</td>
      <td className="p-2 truncate">{mod.department || '—'}</td>
      <td className="p-2">
        <Badge
          className={cn(
            'text-[10px] px-2 py-0.5',
            mod.importance === 'alta' && 'bg-red-100 text-red-700',
            mod.importance === 'mitjana' && 'bg-orange-100 text-orange-700',
            mod.importance === 'baixa' && 'bg-blue-100 text-blue-700'
          )}
        >
          {mod.importance}
        </Badge>
      </td>
      <td className="p-2 truncate">
        {isEditing ? (
          <Input
            value={draftDesc}
            onChange={(e) => setDraftDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
            }}
            onBlur={() => {
              if (draftDesc !== mod.description) save()
              else setIsEditing(false)
            }}
          />
        ) : (
          mod.description || '—'
        )}
      </td>
      <td className="p-2 text-xs text-slate-600">
        {(() => {
          const d = new Date(mod.createdAt || '')
          return isNaN(d.getTime()) ? '—' : d.toLocaleString('ca-ES')
        })()}
      </td>
    </tr>
  )
}
