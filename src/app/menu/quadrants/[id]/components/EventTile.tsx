// file: src/app/menu/quadrants/[id]/components/EventTile.tsx
'use client'

import React from 'react'
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'

// 🔹 Només farem servir GeneralTooltip
import GeneralTooltip from '@/components/events/GeneralTooltip'

interface QuadrantEvent {
  id: string
  summary: string
  start: string
  end: string
  location: string
  pax: number
  state: 'pending' | 'draft' | 'confirmed'
  name: string
  eventCode: string
  locationShort?: string
  mapsUrl?: string
  commercial?: string
}

interface EventTileProps {
  event: QuadrantEvent
  onClick: (ev: QuadrantEvent) => void
}

const lnStyles: Record<string, { label: string; badge: string; bg: string }> = {
  PM: { label: 'Prova de menú', badge: 'bg-amber-50 text-amber-700 border-amber-200', bg: 'from-amber-50 to-amber-100/80' },
  E:  { label: 'Empresa',       badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bg: 'from-emerald-50 to-emerald-100/80' },
  C:  { label: 'Casaments',     badge: 'bg-sky-50 text-sky-700 border-sky-200',            bg: 'from-sky-50 to-sky-100/80' },
  F:  { label: 'Foodlovers',    badge: 'bg-rose-50 text-rose-700 border-rose-200',        bg: 'from-rose-50 to-rose-100/80' },
  A:  { label: 'Agenda',        badge: 'bg-violet-50 text-violet-700 border-violet-200',  bg: 'from-violet-50 to-violet-100/80' },
  '-':{ label: '—',             badge: 'bg-slate-100 text-slate-700 border-slate-200',    bg: 'from-gray-50 to-gray-100/80' },
}

function statusColor(s: 'pending' | 'draft' | 'confirmed') {
  return s === 'pending'   ? 'bg-yellow-500'
       : s === 'draft'     ? 'bg-blue-500'
       : 'bg-green-600'
}

function getLnKey(codeRaw: string): keyof typeof lnStyles {
  const up = codeRaw.toUpperCase()
  if (up.startsWith('PM')) return 'PM'
  const k = up.charAt(0)
  return (['E','C','F','A'] as const).includes(k as keyof typeof lnStyles) ? (k as keyof typeof lnStyles) : '-'
}

function getEventTitle(ev: QuadrantEvent) {
  if (ev.name && ev.name.trim() !== '') return ev.name
  if (ev.summary) {
    const parts = ev.summary.split('-').map(p => p.trim())
    if (parts.length >= 2) return parts[1]
    return ev.summary
  }
  return '—'
}

function startDayLabel(start: string) {
  const d = new Date(start.includes('T') ? start : `${start}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })
}

export default function EventTile({ event, onClick }: EventTileProps) {
  const codeRaw = (event.eventCode || '').replace(/^#/, '').toUpperCase()
  const lnKey   = getLnKey(codeRaw)
  const ln      = lnStyles[lnKey] || lnStyles['-']

  const locShort = event.locationShort ||
    (event.location ? (event.location.split(/[|,\.]/)[0] || event.location).trim() : '')

  const startDay  = startDayLabel(event.start)
  const startTime = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const endTime   = event.end
    ? new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // 👇 Afegim un log perquè no quedin "unused vars"
  console.log('[EventTile times]', { startDay, startTime, endTime })

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          layout
          onClick={() => onClick(event)}
          className="relative cursor-pointer bg-gradient-to-br from-orange-100/40 to-orange-50/30 border-l-4 border-orange-300 rounded-2xl shadow-sm hover:shadow-md transition-transform duration-150"
          whileHover={{ scale: 1.02 }}
        >
          <Card
            className={`min-h-[75px] w-full rounded-xl border shadow-sm hover:shadow-md transition bg-gradient-to-br ${ln.bg}`}
          >
            <CardContent className="h-full px-2 py-1 flex flex-col justify-between">
              {/* Nom */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 truncate leading-tight">
                  {getEventTitle(event)}
                </span>
                <span
                  className={`h-3 w-3 rounded-full border-2 border-white shadow ${statusColor(event.state)}`}
                />
              </div>

              {/* Ubicació */}
              <div className="text-[12px] text-grey-800 truncate leading-snug">
                {locShort || '—'}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </TooltipTrigger>

      {/* 🔹 Tooltip sempre GeneralTooltip */}
      <GeneralTooltip
        summary={event.summary}
        location={event.location}
        pax={event.pax}
        start={event.start}
        end={event.end}
        commercial={event.commercial}
      />
    </Tooltip>
  )
}
