//file: src/components/events/EventCard.tsx
'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Users, Tag, Info } from 'lucide-react'
import { colorByLN } from '@/lib/colors'

interface LastAviso {
  content: string
  department: string
  createdAt: string
}

interface EventData {
  id: string
  summary: string
  NomEvent?: string
  pax?: number | string
  start: string
  end: string
  location?: string
  Ubicacio?: string
  eventCode?: string | null
  LN?: string
  lnKey?: string
  lnLabel?: string
  lastAviso?: LastAviso | null
  avisosUnread?: number
}

interface Props {
  event: EventData
  onOpenMenu: () => void
  onOpenAvisos: () => void
}

function cleanEventName(s?: string) {
  if (!s) return ''
  let t = s.replace(/^\s*[A-Z]\s*-\s*/i, '').trim()
  const stopIndex = t.search(/#|code/i)
  if (stopIndex > -1) t = t.substring(0, stopIndex).trim()
  return t
}

export default function EventCard({ event, onOpenMenu, onOpenAvisos }: Props) {
  const name = event.NomEvent || event.summary || ''
  const displaySummary = cleanEventName(name)

  const ln = event.LN || event.lnKey || event.lnLabel || 'altres'
  const lnColor = colorByLN(ln)

  const location = event.Ubicacio || event.location || ''
  const mapsUrl = location
    ? `https://www.google.com/maps?q=${encodeURIComponent(location)}`
    : null

  const hasAviso = Boolean(event.lastAviso)

  return (
    <Card
      onClick={onOpenMenu}
      className="flex w-full flex-col gap-1.5 cursor-pointer rounded-xl bg-white p-2.5 sm:p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col flex-1">
          <h3
            className="line-clamp-1 sm:line-clamp-2 text-sm font-semibold leading-snug text-gray-900"
            title={displaySummary}
          >
            {displaySummary}
          </h3>

         <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            {ln && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${lnColor}`}>
                {ln.charAt(0).toUpperCase() + ln.slice(1)}
              </span>
            )}

            {event.eventCode && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Tag className="h-3 w-3 text-gray-400" />
                {event.eventCode}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Obrir avisos de produccio"
            onClick={(e) => {
              e.stopPropagation()
              onOpenAvisos()
            }}
          >
            <Info
              className={hasAviso ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-gray-300'}
            />
          </button>

          {event.pax && (
           <span className="flex items-center gap-1 rounded-full bg-pink-100 px-1.5 py-0.5 text-[11px] font-bold text-pink-700">
              <Users className="h-3 w-3" />
              {Number(event.pax)}
            </span>
          )}
        </div>
      </div>

      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[11px] sm:text-[12px] text-gray-500 hover:text-blue-600"

        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{location}</span>
        </a>
      )}
    </Card>
  )
}
