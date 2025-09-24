// file: src/components/events/GeneralTooltip.tsx
'use client'

import { TooltipContent } from '@/components/ui/tooltip'

type GeneralTooltipProps = {
  summary: string
  location?: string
  pax?: number
  start?: string
  end?: string
  commercial?: string
}

export default function GeneralTooltip({
  summary,
  location,
  pax,
  start,
  end,
  commercial,
}: GeneralTooltipProps) {
  const startTime = start
    ? new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'
  const endTime = end
    ? new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // 🔹 URL de Google Maps
  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null

  return (
    <TooltipContent
      side="top"
      className="max-w-sm p-3 bg-white border border-slate-200 shadow-xl rounded-xl"
    >
      <div className="space-y-2 text-[13px]">
        <p className="font-semibold text-slate-900">{summary}</p>

        <p className="text-slate-600">
          <span className="text-slate-500">Ubicació: </span>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {location}
            </a>
          ) : (
            '—'
          )}
        </p>

        <p className="text-slate-600">
          <span className="text-slate-500">Comercial: </span>
          {commercial || '—'}
        </p>

        <p className="text-slate-600">
          <span className="text-slate-500">Horari: </span>
          {startTime}
          {endTime && ` - ${endTime}`}
        </p>

        <p className="text-slate-900 font-bold">Pax: {pax || '—'}</p>
      </div>
    </TooltipContent>
  )
}
