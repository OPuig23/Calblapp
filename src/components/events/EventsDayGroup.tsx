//filename: src/components/events/EventsDayGroup.tsx
'use client'

import React from 'react'
import EventCard from './EventCard'
import { Users, Calendar } from 'lucide-react'

interface EventData {
  id: string
  summary: string
  pax?: number | string
  start: string
  end: string
  location?: string
  lnKey?: 'empresa' | 'casaments' | 'foodlovers' | 'agenda' | 'altres'
  lnLabel?: string
  responsableName?: string
}

interface Props {
  date: string
  events: EventData[]
  onEventClick?: (ev: EventData) => void
}

const lnClasses: Record<string, string> = {
  empresa:   'bg-blue-100 text-blue-700',
  casaments: 'bg-orange-100 text-orange-700',
  foodlovers:'bg-green-100 text-green-700',
  agenda:    'bg-gray-100 text-gray-700',
  altres:    'bg-slate-100 text-slate-700',
}

export default function EventsDayGroup({ date, events, onEventClick }: Props) {
  const totalPax = events.reduce((sum, e) => sum + (Number(e.pax) || 0), 0)
  const totalEvents = events.length

  return (
    <section className="mb-6">
      {/* Capçalera de dia */}
      <header className="flex items-center justify-between mb-3 bg-blue-50 p-3 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {date}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
            <Calendar className="w-3 h-3" />
            {totalEvents} esdeveniments
          </span>
        </h2>
        <span className="flex items-center gap-1 text-pink-600 font-bold">
          <Users className="w-4 h-4" />
          {totalPax} pax
        </span>
      </header>

      {/* Targetes d'esdeveniment */}
      <div className="flex flex-col gap-3">
        {events.map(event => (
          <div
            key={event.id}
            className="relative"
            onClick={() => onEventClick?.(event)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEventClick?.(event)
              }
            }}
            role="button"
            tabIndex={0}
          >
            {/* Badge LN */}
            {event.lnLabel && (
              <span
                className={`absolute right-20 top-5 z-10 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${lnClasses[event.lnKey || 'altres']}`}
              >
                {event.lnLabel}
              </span>
            )}

            <EventCard event={event as any} />
          </div>
        ))}
      </div>
    </section>
  )
}
