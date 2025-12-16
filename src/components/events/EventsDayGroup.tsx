'use client'

import React from 'react'
import EventCard from './EventCard'
import { Users, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'

/* ───────────────── Tipus ───────────────── */

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

  /**
   * Callback únic cap al page
   * mode = 'menu' | 'avisos'
   */
  onEventClick?: (ev: EventData, mode?: 'menu' | 'avisos') => void
}

/* ───────────────── Component ───────────────── */

export default function EventsDayGroup({ date, events, onEventClick }: Props) {
  const totalPax = events.reduce((sum, e) => sum + (Number(e.pax) || 0), 0)
  const totalEvents = events.length

  return (
    <section className="mb-6">
      {/* ───── Capçalera de dia ───── */}
      <header className="flex items-center justify-between mb-3 bg-blue-50 p-3 rounded-xl shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          {format(parseISO(date), 'dd/MM/yyyy', { locale: ca })}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
            <Calendar className="w-3 h-3" />
            {totalEvents} esdeveniments
          </span>
        </h2>

        <span className="flex items-center gap-1 text-pink-600 font-bold">
          <Users className="w-4 h-4" />
          {totalPax} pax
        </span>
      </header>

      {/* ───── Targetes ───── */}
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
