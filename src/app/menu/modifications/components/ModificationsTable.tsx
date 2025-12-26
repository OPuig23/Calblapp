// file: src/app/menu/modifications/components/ModificationsTable.tsx
'use client'

import React from 'react'
import { Modification } from '@/hooks/useModifications'
import ModificationsEventGroup from './ModificationsEventGroup'

interface Props {
  modifications: Modification[]
  onUpdate: (id: string, data: Partial<Modification>) => Promise<any> | void
}

export default function ModificationsTable({ modifications, onUpdate }: Props) {
  // Agrupació per dia -> esdeveniment
  const days = modifications.reduce((acc: any, mod) => {
    const day = (mod.eventDate || mod.createdAt || '').slice(0, 10)
    if (!acc[day]) acc[day] = {}
    const key = mod.eventId || 'no-event'

    if (!acc[day][key]) {
      acc[day][key] = {
        eventTitle: mod.eventTitle,
        eventCode: mod.eventCode,
        location: mod.eventLocation,
        commercial: mod.eventCommercial,
        count: 0,
        rows: [] as Modification[],
      }
    }

    acc[day][key].rows.push(mod)
    acc[day][key].count += 1
    return acc
  }, {} as Record<string, any>)

  const sortedDays = Object.keys(days).sort()

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {sortedDays.map((day) => (
        <div key={day}>
          <div className="px-4 py-2 bg-slate-50 border-b text-sm font-semibold">
            {day || 'Sense data'}
          </div>

          {Object.values(days[day]).map((event: any, i: number) => (
            <ModificationsEventGroup
              key={i}
              event={event}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
