// filename: src/components/events/EventCard.tsx
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
    <Card className="rounded-2xl p-4 shadow-md bg-white hover:shadow-lg hover:scale-[1.01] transition cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-base font-semibold text-gray-900 truncate"
          title={displaySummary}
        >
          {displaySummary}
        </h3>
        {event.pax && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700">
            <Users className="w-3 h-3" />
            {Number(event.pax)}
          </span>
        )}
      </div>

      {(mapsUrl || event.eventCode) && (
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-left hover:text-blue-600 truncate"
            >
              <MapPin className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">{event.location}</span>
            </a>
          )}
          {event.eventCode && (
            <span className="flex items-center gap-1 text-s text-blue-500 ml-133 shrink-0">
              <Tag className="w-5 h-5" />
              {event.eventCode}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
