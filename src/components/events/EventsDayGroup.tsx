'use client'

import React from 'react'
import EventCard from './EventCard'
import { Users, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'

export interface EventData {
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
  onEventClick?: (ev: EventData, mode?: 'menu' | 'avisos') => void
}

export default function EventsDayGroup({ date, events, onEventClick }: Props) {
  const totalPax = events.reduce((sum, e) => sum + (Number(e.pax) || 0), 0)
  const totalEvents = events.length

  return (
    <section className="mb-6">
      <header className="mb-3 flex flex-col gap-2 rounded-xl bg-blue-50 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-gray-800">
          {format(parseISO(date), 'dd/MM/yyyy', { locale: ca })}
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-sm font-medium text-purple-700">
            <Calendar className="h-3 w-3" />
            {totalEvents} esdeveniments
          </span>
        </h2>

        <span className="flex items-center gap-1 text-sm font-bold text-pink-600 sm:text-base">
          <Users className="h-4 w-4" />
          {totalPax} pax
        </span>
      </header>

      <div className="flex flex-col gap-3">
        {events.map(event => (
          <div
            key={event.id}
            className="relative"
            role="button"
            tabIndex={0}
            onClick={() => onEventClick?.(event, 'menu')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEventClick?.(event, 'menu')
              }
            }}
          >
            <EventCard
              event={event}
              onOpenMenu={() => onEventClick?.(event, 'menu')}
              onOpenAvisos={() => onEventClick?.(event, 'avisos')}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
