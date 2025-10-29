'use client'

import { STAGE_COLORS } from '@/lib/colors'
import type { Stage } from '@/services/spaces/spaces'
import { AlertTriangle } from 'lucide-react'

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
  warning?: boolean
}

interface SpaceCellProps {
  event: SpaceCellEvent
}

/**
 * 🔹 SpaceCell
 * Targeta individual d’esdeveniment dins la graella setmanal d’Espais.
 * - Pinta color segons stage (verd, blau, taronja, lila)
 * - Si hi ha warning → mostra triangle vermell ⚠️
 * - Si està descartat → color vermell i text reforçat
 * - Mobile-first, accessible i amb tooltip complet
 */
export default function SpaceCell({ event }: SpaceCellProps) {
  // 🔸 Normalitza camps
  const eventName = event.eventName || event.NomEvent || ''
  const commercial = event.commercial || event.Comercial || ''
  const numPax = event.numPax ?? event.NumPax ?? 0
  const stage = event.stage || event.Stage || 'verd'

  // 🔸 Estat visual
  const isDiscarded = event.discarded ?? false
  const hasWarning = event.warning ?? false
  const reason = event.reason ?? ''

  // 🔸 Colors base
  const baseColor = isDiscarded
    ? 'bg-red-100 text-red-700 border border-red-300'
    : STAGE_COLORS[stage] || 'bg-gray-50 text-gray-700'

  // 🔸 Texts
  const shortEvent =
    eventName.length > 25 ? `${eventName.slice(0, 25).trim()}…` : eventName
  const titleText = [eventName, commercial, numPax ? `${numPax} pax` : '']
    .filter(Boolean)
    .join(' · ')
  const tooltip = reason
    ? `${titleText} ⚠️ ${reason}`
    : titleText || 'Esdeveniment sense nom'

  // 🔸 Render
  return (
    <div
      className={`rounded-md px-2 py-[4px] min-h-9 flex flex-col justify-center text-[11px] text-center sm:text-left ${baseColor} cursor-pointer shadow-sm hover:shadow transition`}
      title={tooltip}
    >
      {/* ─── Nom + Avís ─── */}
      {shortEvent && (
        <span
          className={`font-medium truncate flex items-center justify-center sm:justify-start gap-1 ${
            isDiscarded ? 'text-red-800 font-semibold' : ''
          }`}
        >
        {shortEvent}
{hasWarning && (
<AlertTriangle
  className="w-3 h-3 text-red-600 shrink-0"
  {...({ title: reason || 'Possible conflicte' } as React.SVGProps<SVGSVGElement>)}
/>


)}

        </span>
      )}

      {/* ─── Comercial ─── */}
      {commercial && (
        <span
          className={`text-[10px] truncate ${
            isDiscarded ? 'text-red-700' : 'opacity-80'
          }`}
        >
          {commercial}
        </span>
      )}

      {/* ─── Num. Pax ─── */}
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
