// filename: src/app/menu/incidents/components/IncidentsList.tsx
'use client'

import React from 'react'
import { Incident } from '@/hooks/useIncidents'
import IncidentCardGrouped from './IncidentCardGrouped'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

export default function IncidentsList({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) return <p className="p-4">No hi ha incidències.</p>

  // Agrupar per data
  const byDate = incidents.reduce((acc, inc) => {
    const dateKey = inc.eventDate ? inc.eventDate.slice(0, 10) : 'sense-data'
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(inc)
    return acc
  }, {} as Record<string, Incident[]>)

  // Ordenar ASC (primer dia primer)
  const sortedDates = Object.keys(byDate).sort((a, b) => (a > b ? 1 : -1))

  return (
    <div className="p-2 space-y-6">
      {sortedDates.map((dateKey) => {
        const incs = byDate[dateKey]
        const totalIncidencies = incs.length

        // Agrupar dins del dia per eventCode
        const grouped = incs.reduce((acc, inc) => {
          const key = inc.eventCode || inc.eventId
          if (!acc[key]) acc[key] = []
          acc[key].push(inc)
          return acc
        }, {} as Record<string, Incident[]>)

        return (
          <div key={dateKey}>
            {/* 🔹 Capçalera de dia estil EventsDayGroup */}
            <header className="flex items-center justify-between mb-3 bg-blue-50 p-3 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {new Date(dateKey).toLocaleDateString()}
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 text-purple-700 bg-purple-100"
                >
                  <Calendar className="w-3 h-3" />
                  {totalIncidencies} incidència
                  {totalIncidencies > 1 ? 's' : ''}
                </Badge>
              </h2>
            </header>

            {/* 🔹 Targetes per esdeveniment */}
            <div className="space-y-4">
              {Object.entries(grouped).map(([eventCode, incs]) => (
                <IncidentCardGrouped
                  key={eventCode}
                  eventCode={eventCode}
                  incidents={incs}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
