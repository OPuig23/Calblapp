// file: src/components/events/EventCard.tsx
'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Users, Tag } from 'lucide-react'

interface EventData {
  id: string
  summary: string
  pax?: number | string
  start: string
  end: string
  location?: string
  eventCode?: string | null
  lnLabel?: string
}

/* Helpers */
function cleanEventName(s?: string) {
  if (!s) return ''
  let t = s.replace(/^\s*[A-Z]\s*-\s*/i, '').trim()
  const stopIndex = t.search(/#|code/i)
  if (stopIndex > -1) t = t.substring(0, stopIndex).trim()
  return t
}

export default function EventCard({ event }: { event: EventData }) {
  const mapsUrl = event.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(event.location)}`
    : null

  const displaySummary = cleanEventName(event.summary)

  return (
    <Card
      className="rounded-2xl p-3 sm:p-4 bg-white shadow-sm hover:shadow-md hover:scale-[1.01] transition cursor-pointer
                 flex flex-col justify-between h-full"
    >
      {/* ───── Títol + Pax ───── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3
          className="text-[15px] sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 flex-1"
          title={displaySummary}
        >
          {displaySummary}
        </h3>

        {event.pax && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-pink-100 text-pink-700 shrink-0">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            {Number(event.pax)}
          </span>
        )}
      </div>

      {/* ───── LN + Codi ───── */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-1">
        {event.lnLabel && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {event.lnLabel}
          </span>
        )}

        {event.eventCode && (
          <span className="flex items-center gap-1 text-gray-500">
            <Tag className="w-3 h-3 text-gray-400" />
            {event.eventCode}
          </span>
        )}
      </div>

      {/* ───── Ubicació ───── */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[12px] sm:text-sm text-gray-500 hover:text-blue-600 truncate"
        >
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="truncate">{event.location}</span>
        </a>
      )}
    </Card>
  )
}
