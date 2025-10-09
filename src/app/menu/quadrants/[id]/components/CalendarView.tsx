// file: src/app/menu/quadrants/[id]/components/CalendarView.tsx
'use client'

import React from 'react'
import { Users, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import EventTile from './EventTile'
import type { QuadrantEvent } from '@/types/QuadrantEvent'

interface CalendarViewProps {
  date: string
  events: QuadrantEvent[]
  onEventClick?: (ev: QuadrantEvent) => void
}

export default function CalendarView({
  date,
  events,
  onEventClick,
}: CalendarViewProps) {
  // ✅ Càlcul total de persones úniques per tot el dia
  const totalWorkers = React.useMemo(() => {
    const people = new Set<string>()

    for (const e of events) {
      // Responsable
      if (e.responsable) people.add(e.responsable)

      // Conductors
      if (Array.isArray(e.conductors)) {
        e.conductors.forEach((c: any) => {
          if (typeof c === 'string') people.add(c)
          else if (c?.name) people.add(c.name)
        })
      }

      // Treballadors
      if (Array.isArray(e.treballadors)) {
        e.treballadors.forEach((t: any) => {
          if (typeof t === 'string') people.add(t)
          else if (t?.name) people.add(t.name)
        })
      }
    }

    return people.size
  }, [events])

  // 🔹 Nombre total de quadrants del dia
  const totalEvents = events.length

  return (
    <section className="mb-6">
      {/* 🟦 Capçalera del dia */}
      <header className="flex items-center justify-between mb-3 bg-indigo-50 p-3 rounded-xl shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          {format(parseISO(date), 'dd/MM/yyyy', { locale: ca })}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
            <Calendar className="w-3 h-3" />
            {totalEvents} quadrant{totalEvents !== 1 && 's'}
          </span>
        </h2>

        <span className="flex items-center gap-1 text-pink-600 font-bold">
          <Users className="w-4 h-4" />
          {totalWorkers} {totalWorkers === 1 ? 'persona' : 'persones'}
        </span>
      </header>

      {/* 🔸 Targetes de quadrant */}
      <div className="flex flex-col gap-3 bg-white">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="relative"
            onClick={() => onEventClick?.(ev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEventClick?.(ev)
              }
            }}
            role="button"
            tabIndex={0}
          >
            <EventTile event={ev} onClick={() => onEventClick?.(ev)} />
          </div>
        ))}
      </div>
    </section>
  )
}
