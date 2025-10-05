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
  lnKey?: string
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

/* Colors per línia de negoci */
const lnColors: Record<string, string> = {
  empresa: 'bg-blue-100 text-blue-700',
  casaments: 'bg-orange-100 text-orange-700',
  foodlovers: 'bg-green-100 text-green-700',
  agenda: 'bg-gray-100 text-gray-700',
  altres: 'bg-slate-100 text-slate-700',
}

export default function EventCard({ event }: { event: EventData }) {
  const mapsUrl = event.location
    ? `https://www.google.com/maps?q=${encodeURIComponent(event.location)}`
    : null

  const displaySummary = cleanEventName(event.summary)

  return (
    <Card
      className="rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between h-full"
    >
      {/* ───── Títol + Pax + LN ───── */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex flex-col flex-1">
          <h3
            className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2"
            title={displaySummary}
          >
            {displaySummary}
          </h3>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {event.lnLabel && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${lnColors[event.lnKey || 'altres']}`}
              >
                {event.lnLabel}
              </span>
            )}
            {event.eventCode && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Tag className="w-3 h-3 text-gray-400" />
                {event.eventCode}
              </span>
            )}
          </div>
        </div>

        {event.pax && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-700 shrink-0">
            <Users className="w-3 h-3" />
            {Number(event.pax)}
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
          className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-blue-600 truncate"
        >
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </a>
      )}
    </Card>
  )
}
