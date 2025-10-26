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
}

interface SpaceCellProps {
  event: SpaceCellEvent
}

/**
 * 🔹 SpaceCell
 * Component que mostra una targeta d’esdeveniment dins la graella setmanal d’Espais.
 * - Compatible amb dades provinents de Firestore i formats mixtos (Zoho, API, etc.).
 * - Disseny mobile-first: mida petita, colors per stage i text truncat.
 */
export default function SpaceCell({ event }: SpaceCellProps) {
  // 🔸 Normalize data (accepta tant eventName com NomEvent, etc.)
  const eventName = event.eventName || event.NomEvent || ''
  const commercial = event.commercial || event.Comercial || ''
  const numPax = event.numPax ?? event.NumPax ?? 0
  const stage = event.stage || event.Stage || 'verd'

  // 🔸 Colors base segons stage
  const baseColor = STAGE_COLORS[stage] || 'bg-gray-50 text-gray-700'

  // 🔸 Truncament i title complet
  const shortEvent =
    eventName.length > 25 ? eventName.slice(0, 25).trim() + '…' : eventName
  const titleText = [eventName, commercial, numPax ? `${numPax} pax` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`rounded-md px-2 py-[4px] min-h-9 flex flex-col justify-center text-[11px] text-center sm:text-left ${baseColor} cursor-pointer shadow-sm hover:shadow transition`}
      title={titleText}
    >
      {shortEvent && <span className="font-medium truncate">{shortEvent}</span>}
      {commercial && (
        <span className="text-[10px] truncate opacity-80">{commercial}</span>
      )}
      {numPax > 0 && (
        <span className="text-[10px] font-semibold text-gray-700">
          {numPax} pax
        </span>
      )}
    </div>
  )
}
