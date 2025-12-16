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

  // Avisos
  lastAviso?: LastAviso | null
  avisosUnread?: number
}

interface Props {
  event: EventData
  onOpenMenu: () => void
  onOpenAvisos: () => void
}

/* Helpers */
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
      className="rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition cursor-pointer flex flex-col gap-2"
    >
      {/* ───── Títol + Pax + LN ───── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col flex-1">
          <h3
            className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2"
            title={displaySummary}
          >
            {displaySummary}
          </h3>

          <div className="flex flex-wrap items-center gap-1 mt-1">
            {ln && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${lnColor}`}>
                {ln.charAt(0).toUpperCase() + ln.slice(1)}
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

        {/* ───── ÚNICA “i” FUNCIONAL ───── */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Obrir avisos de producció"
            onClick={(e) => {
              e.stopPropagation()
              onOpenAvisos()
            }}
          >
            <Info
              className={[
                'w-4 h-4',
                hasAviso ? 'text-blue-600' : 'text-gray-300',
              ].join(' ')}
            />
          </button>

          {event.pax && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-pink-700">
              <Users className="w-3 h-3" />
              {Number(event.pax)}
            </span>
          )}
        </div>
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
          <span className="truncate">{location}</span>
        </a>
      )}

      
    </Card>
  )
}
