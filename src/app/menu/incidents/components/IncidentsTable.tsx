// file: src/app/menu/incidents/components/IncidentsTable.tsx
'use client'

import React from 'react'
import IncidentsEventGroup from './IncidentsEventGroup'
import { Incident } from '@/hooks/useIncidents'

interface Props {
  incidents: Incident[]
  onUpdate: (id: string, data: Partial<Incident>) => void
}

export default function IncidentsTable({ incidents, onUpdate }: Props) {

  // Agrupació per dia i per esdeveniment
  const days = incidents.reduce((acc: any, inc) => {
   const day = (inc.eventDate || '').slice(0, 10)



    if (!acc[day]) acc[day] = {}
    const key = inc.eventId || "no-event"

    if (!acc[day][key]) {
      acc[day][key] = {
        eventTitle: inc.eventTitle,
        eventCode: inc.eventCode,
        ln: inc.ln,
        location: inc.eventLocation,
        serviceType: inc.serviceType,
        pax: inc.pax,
        fincaId: inc.fincaId,
        rows: []
      }
    }

    acc[day][key].rows.push(inc)
    return acc
  }, {})

  const sorted = Object.keys(days).sort()

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {sorted.map(day => (
        <div key={day}>
          <div className="px-4 py-2 bg-slate-50 border-b text-sm font-semibold">
            {day}
          </div>

          {Object.values(days[day]).map((event: any, i: number) => (
            <IncidentsEventGroup key={i} event={event} onUpdate={onUpdate} />
          ))}
        </div>
      ))}
    </div>
  )
}
