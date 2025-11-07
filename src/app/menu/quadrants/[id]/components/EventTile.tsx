//file: src/app/menu/quadrants/%5Bid%5D/components/EventTile.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, User, UtensilsCrossed } from 'lucide-react'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { colorByLN } from '@/lib/colors'

interface QuadrantEvent {
  id: string
  summary: string
  start?: string
  end?: string
  location?: string
  state?: 'pending' | 'draft' | 'confirmed'
  lnLabel?: string
  commercial?: string
  service?: string
  numPax?: string | number
  code?: string
  locationShort?: string
  mapsUrl?: string
  HoraInici?: string
}

/* 🔹 Color d’estat visual segons quadrant real */
function getQuadrantColor(status?: string | null) {
  if (!status) return 'bg-amber-400' // pendent
  if (status === 'draft') return 'bg-blue-400' // esborrany
  if (status === 'confirmed') return 'bg-green-500' // confirmat
  return 'bg-gray-300'
}

export default function EventTile({
  event,
  onClick,
}: {
  event: QuadrantEvent
  onClick: (ev: QuadrantEvent) => void
}) {
  const lnColor = colorByLN(event.lnLabel)
  const stateColor = getQuadrantColor((event as any).quadrantStatus)

  const loc =
    event.locationShort ||
    (event.location ? event.location.split(/[|,\.]/)[0].trim() : '')

  // 🕒 Només mostrem l'hora d'inici real si ve de Firestore
  const startTime =
    (event as any).HoraInici || (event as any).horaInici || null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          layout
          whileHover={{ scale: 1.02 }}
          onClick={() => onClick(event)}
          className={`cursor-pointer rounded-2xl bg-white shadow-md hover:shadow-lg transition-all 
            border-l-4 ${stateColor}`}
        >
          <Card className="border-none bg-transparent rounded-2xl">
            <CardContent className="px-3 py-2 flex flex-col gap-1.5">
              {/* 🔹 Capçalera: nom + hora + punt */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
                    {event.summary || '—'}
                  </h3>

                  {startTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-[1px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{startTime} h</span>
                    </div>
                  )}
                </div>

                <span
                  className={`h-3.5 w-3.5 rounded-full shadow-inner ${stateColor}`}
                  title={event.state || 'pendent'}
                />
              </div>

              {/* 🔹 Bloc 2: Línia negoci + Comercial */}
              <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                <span
                  className={`px-2 py-[1px] rounded-full font-medium ${lnColor}`}
                >
                  {event.lnLabel || 'Altres'}
                </span>
                {event.commercial && (
                  <span className="flex items-center gap-1 text-gray-700">
                    <User className="w-3.5 h-3.5" />
                    <span>{event.commercial}</span>
                  </span>
                )}
              </div>

              {/* 🔹 Bloc 3: Servei + Pax + Codi */}
              <div className="flex flex-wrap gap-2 items-center text-[12px] text-gray-600 mt-0.5">
                {event.service && (
                  <span className="flex items-center gap-1">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>{event.service}</span>
                  </span>
                )}
                {event.numPax && <span>· {event.numPax} pax</span>}
                {event.code && (
                  <span>
                    · <strong className="text-gray-800">{event.code}</strong>
                  </span>
                )}
              </div>

              {/* 🔹 Bloc 4: Ubicació */}
              {loc && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{loc}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </TooltipTrigger>

      
    </Tooltip>
  )
}
