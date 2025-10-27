// ✅ file: src/components/spaces/SpaceCell.tsx
import { STAGE_COLORS } from '@/lib/colors'
import type { Stage } from '@/services/spaces/spaces'

export interface SpaceCellEvent {
  eventName?: string
  NomEvent?: string
  commercial?: string
  Comercial?: string
  numPax?: number
  NumPax?: number
  stage?: Stage
  Stage?: Stage
  discarded?: boolean
  reason?: string
}

interface SpaceCellProps {
  event: SpaceCellEvent
}

/**
 * 🔹 SpaceCell
 * Component que mostra una targeta d’esdeveniment dins la graella setmanal d’Espais.
 * - Mostra color segons stage (verd, blau, taronja, lila)
 * - Si l’event està marcat com "discarded", el pinta en vermell amb tooltip de motiu.
 * - Disseny mobile-first, text truncat i accessible.
 */
export default function SpaceCell({ event }: SpaceCellProps) {
  // 🔸 Normalize data (accepta tant eventName com NomEvent, etc.)
  const eventName = event.eventName || event.NomEvent || ''
  const commercial = event.commercial || event.Comercial || ''
  const numPax = event.numPax ?? event.NumPax ?? 0
  const stage = event.stage || event.Stage || 'verd'

  // 🔸 Camps de conflicte
  const isDiscarded = event.discarded ?? false
  const reason = event.reason ?? ''

  // 🔸 Colors base segons stage o conflicte
  const baseColor = isDiscarded
    ? 'bg-red-100 text-red-700 border border-red-300'
    : STAGE_COLORS[stage] || 'bg-gray-50 text-gray-700'

  // 🔸 Truncament i title complet
  const shortEvent =
    eventName.length > 25 ? eventName.slice(0, 25).trim() + '…' : eventName
  const titleText = [eventName, commercial, numPax ? `${numPax} pax` : '']
    .filter(Boolean)
    .join(' · ')

  // 🔸 Tooltip amb motiu si hi ha conflicte
  const tooltip = reason ? `${titleText} ⚠️ ${reason}` : titleText

  return (
    <div
      className={`rounded-md px-2 py-[4px] min-h-9 flex flex-col justify-center text-[11px] text-center sm:text-left ${baseColor} cursor-pointer shadow-sm hover:shadow transition`}
      title={tooltip}
    >
      {shortEvent && (
        <span
          className={`font-medium truncate ${
            isDiscarded ? 'text-red-800 font-semibold' : ''
          }`}
        >
          {shortEvent}
        </span>
      )}
      {commercial && (
        <span
          className={`text-[10px] truncate ${
            isDiscarded ? 'text-red-700' : 'opacity-80'
          }`}
        >
          {commercial}
        </span>
      )}
      {numPax > 0 && (
        <span
          className={`text-[10px] font-semibold ${
            isDiscarded ? 'text-red-700' : 'text-gray-700'
          }`}
        >
          {numPax} pax
        </span>
      )}
    </div>
  )
}
