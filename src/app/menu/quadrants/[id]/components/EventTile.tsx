//file: src/app/menu/quadrants/%5Bid%5D/components/EventTile.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import GeneralTooltip from '@/components/events/GeneralTooltip'

interface QuadrantEvent {
  id: string
  summary: string
  start: string
  end: string
  location: string
  state: 'pending' | 'draft' | 'confirmed'
  name: string
  eventCode: string
  locationShort?: string
  mapsUrl?: string
  commercial?: string
  service?: string
}

/* 🎨 Colors per línia de negoci */
const lnStyles: Record<string, { label: string; badge: string }> = {
  PM: { label: 'Prova de menú', badge: 'bg-amber-200 text-amber-700' },
  E:  { label: 'Empresa',       badge: 'bg-emerald-200 text-emerald-700' },
  C:  { label: 'Casaments',     badge: 'bg-sky-200 text-sky-700' },
  F:  { label: 'Foodlovers',    badge: 'bg-rose-200 text-rose-700' },
  A:  { label: 'Agenda',        badge: 'bg-violet-200 text-violet-700' },
  '-':{ label: '—',             badge: 'bg-slate-200 text-slate-700' },
}

/* 🟢 Color de punt segons estat */
function statusColor(s: 'pending' | 'draft' | 'confirmed') {
  return s === 'pending'
    ? 'bg-yellow-500'
    : s === 'draft'
    ? 'bg-blue-500'
    : 'bg-green-600'
}

/* 🔠 Obtenir LN segons codi */
function getLnKey(codeRaw: string): keyof typeof lnStyles {
  const up = codeRaw.toUpperCase()
  if (up.startsWith('PM')) return 'PM'
  const k = up.charAt(0) as keyof typeof lnStyles
  return ['E', 'C', 'F', 'A'].includes(k) ? k : '-'
}

/* 🔤 Nom d’esdeveniment net */
function getEventTitle(ev: QuadrantEvent) {
  if (ev.name?.trim()) return ev.name
  const parts = ev.summary?.split('-').map(p => p.trim()) || []
  return parts.length >= 2 ? parts[1] : ev.summary || '—'
}

/* 🔗 Ubicació */
function renderLocation(ev: QuadrantEvent) {
  const locShort =
    ev.locationShort ||
    (ev.location ? (ev.location.split(/[|,\.]/)[0] || ev.location).trim() : '')
  if (!locShort) return null

  const isLink = !!ev.mapsUrl
  const baseClass = `flex items-center gap-1 text-[12px] truncate ${
    isLink ? 'text-blue-600 font-medium' : 'text-gray-600'
  }`

  return isLink ? (
    <a href={ev.mapsUrl} target="_blank" rel="noopener noreferrer" className={baseClass}>
      <MapPin className="w-3.5 h-3.5 text-blue-500" />
      <span>{locShort}</span>
    </a>
  ) : (
    <div className={baseClass}>
      <MapPin className="w-3.5 h-3.5 text-gray-400" />
      <span>{locShort}</span>
    </div>
  )
}

/* ──────────────────────────────────────────────── */
/* Component principal */
/* ──────────────────────────────────────────────── */
export default function EventTile({
  event,
  onClick,
}: {
  event: QuadrantEvent
  onClick: (ev: QuadrantEvent) => void
}) {
  const codeRaw = (event.eventCode || '').replace(/^#/, '').toUpperCase()
  const lnKey = getLnKey(codeRaw)
  const ln = lnStyles[lnKey] || lnStyles['C'] // 👈 color per defecte

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          layout
          onClick={() => onClick(event)}
          whileHover={{ scale: 1.02 }}
          className={`cursor-pointer rounded-2xl border-l-4 ${
            ln.badge.replace('bg-', 'border-')
          } shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:brightness-105 transition-all duration-200 
          bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-inset ring-gray-100`}
        >
          <Card className="border-none bg-transparent rounded-2xl">
            <CardContent className="px-3 py-2 flex flex-col gap-1.5">
              
              {/* 🔹 Línia 1: Nom + Codi + Estat */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {getEventTitle(event)}{' '}
                  {event.eventCode && (
                    <span className="text-gray-500 text-xs">· #{event.eventCode}</span>
                  )}
                </h3>
                <span
                  className={`h-3 w-3 rounded-full border-2 border-white shadow ${statusColor(event.state)}`}
                  title={event.state}
                />
              </div>

              {/* 🔹 Línia 2: LN + Comercial + Servei */}
              <div className="text-[12px] text-gray-700 truncate flex items-center gap-1">
                <span className={`px-2 py-[1px] rounded-full text-[11px] font-medium ${ln.badge}`}>
                  {ln.label}
                </span>
                <span>· Comercial: {event.commercial || '—'}</span>
                <span>· Servei: {event.service || '—'}</span>
              </div>

              {/* 🔹 Línia 3: Ubicació */}
              {renderLocation(event)}
            </CardContent>
          </Card>
        </motion.div>
      </TooltipTrigger>

      {/* 🧠 Tooltip ampli */}
      <GeneralTooltip
        summary={event.summary}
        location={event.location}
        start={event.start}
        end={event.end}
        commercial={event.commercial}
      />
    </Tooltip>
  )
}
