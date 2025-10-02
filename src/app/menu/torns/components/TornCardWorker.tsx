// filename: src/app/menu/torns/components/TornCardWorker.tsx
'use client'

import React from 'react'
import { MapPin, Tag } from 'lucide-react'

export type TornCardWorkerItem = {
  id: string
  code: string
  eventName: string
  date: string
  startTime?: string
  endTime?: string
  location?: string
  mapsUrl?: string
  meetingPoint?: string
  workerRole: 'responsable' | 'conductor' | 'treballador' | null
  workerName: string
}

/* Helpers */
function shortLocation(s?: string) {
  if (!s) return ''
  return s.split(',')[0]?.trim() || s
}

function detectLN(code?: string): string {
  if (!code) return 'altres'
  const prefix = code.trim().charAt(0).toUpperCase()
  switch (prefix) {
    case 'C': return 'casaments'
    case 'E': return 'empresa'
    case 'F': return 'foodlovers'
    case 'A': return 'agenda'
    default:  return 'altres'
  }
}

function cleanEventName(s?: string) {
  if (!s) return ''
 const t = s.replace(/^\s*[A-Z]\s*-\s*/i, '').trim()
  const STOP = [
    'FC','SOPAR','DINAR','BRUNCH','CERIMONIA','CERIMÒNIA',
    'BANQUET','COCTEL','CÒCTEL','PAX'
  ]
  const parts = t.split(/\s-\s/).map(p => p.trim())
  const out: string[] = []
  for (const p of parts) {
    const up = p.toUpperCase()
    if (
      STOP.some(w => up.startsWith(w)) ||
      /\d{1,2}:\d{2}h/i.test(p) ||
      /\d+\s*pax/i.test(p)
    ) break
    out.push(p)
  }
  return out.join(' - ').trim() || t
}

/* UI Pills */
function RolePill({ role }: { role: TornCardWorkerItem['workerRole'] }) {
  const r = (role ?? '').toLowerCase().trim()

  console.log('[RolePill]', { original: role, normalized: r })

  const label =
    r === 'responsable' ? 'Responsable'
    : r === 'conductor' ? 'Conductor'
    : 'Treballador'

  const cls =
    r === 'responsable'
      ? 'bg-orange-100 text-orange-800 border-orange-200'
      : r === 'conductor'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-green-100 text-green-800 border-green-200'

  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {label}
    </span>
  )
}


function LnBadge({ ln }: { ln: string }) {
  const cls =
    ln === 'empresa'
      ? 'bg-blue-100 text-blue-700'
      : ln === 'casaments'
      ? 'bg-orange-100 text-orange-700'
      : ln === 'foodlovers'
      ? 'bg-green-100 text-green-700'
      : ln === 'agenda'
      ? 'bg-gray-100 text-gray-700'
      : 'bg-slate-100 text-slate-700'
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {ln}
    </span>
  )
}

type Props = { item: TornCardWorkerItem; onClick?: () => void }

export default function TornCardWorker({ item, onClick }: Props) {
  if (!item) return null

  const ln = detectLN(item.code)
  const eventClean = cleanEventName(item.eventName)
  const placeShort = shortLocation(item.location)
  const mapsUrl =
    item.mapsUrl ||
    (item.location ? `https://www.google.com/maps?q=${encodeURIComponent(item.location)}` : null)

  // 🔎 Log quirúrgic per traçar què rebem
console.log('[TornCardWorker] item', {
  id: item.id,
  workerName: item.workerName,
  workerRole: item.workerRole,
  startTime: item.startTime,
  endTime: item.endTime,
  meetingPoint: item.meetingPoint,
  code: item.code,
  eventName: item.eventName,
})

  return (
    <article
      className="rounded-2xl border border-border p-4 shadow-sm bg-white cursor-pointer hover:shadow-md transition"
      onClick={onClick}
    >
      {/* Header compacte */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <RolePill role={item.workerRole} />
          <LnBadge ln={ln} />
        </div>
      </div>

      {/* Nom treballador + Hora + Meeting point */}
      <div className="text-base font-semibold text-gray-900 mb-2 flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold text-gray-800">{item.workerName}</span>
        {item.startTime && item.endTime && (
          <span className="text-lg text-gray-900">
            {item.startTime} – {item.endTime}
          </span>
        )}
        {item.meetingPoint && (
          <span className="uppercase tracking-wide text-blue-700">
            · {item.meetingPoint}
          </span>
        )}
      </div>

      {/* Ubicació curta amb enllaç */}
      {item.location && (
        <div className="text-sm text-gray-700 mb-2 flex items-center gap-1">
          <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:no-underline truncate"
              title="Obrir a Google Maps"
              onClick={(e) => e.stopPropagation()}
            >
              {placeShort}
            </a>
          ) : (
            <span className="truncate">{placeShort}</span>
          )}
        </div>
      )}

      {/* Nom esdeveniment + Codi */}
      {eventClean && (
        <div className="mt-1 flex items-center justify-between">
          <div
            className="text-sm font-medium text-gray-900 truncate"
            title={eventClean}
          >
            {eventClean}
          </div>
          {item.code && (
            <div className="text-xs text-gray-400 flex items-center gap-1 ml-2 shrink-0">
              <Tag className="w-3 h-3" />
              {item.code}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
