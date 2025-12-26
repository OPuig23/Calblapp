// file: src/components/calendar/CalendarWeekView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'

function dotColor(ev: Deal): string {
  const s = (ev.StageGroup || '').toLowerCase()

  if (s.includes('confirmat') || s.includes('ganada')) return 'bg-green-500'
  if (s.includes('proposta') || s.includes('pendent')) return 'bg-amber-500'
  if (s.includes('prereserva') || s.includes('calent')) return 'bg-blue-500'

  const c = (ev.collection || '').toLowerCase()
  if (c.includes('verd')) return 'bg-green-500'
  if (c.includes('taronja')) return 'bg-amber-500'
  if (c.includes('taronja')) return 'bg-blue-500'

  return 'bg-gray-300'
}

type Span = {
  ev: Deal
  startIdx: number
  endIdx: number
  lane: number
}

const diffDays = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000))

const pickDateIso = (ev: Deal, keys: string[]) => {
  for (const k of keys) {
    const v = (ev as any)?.[k]
    if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10)
  }
  return ''
}

const VISIBLE_LANES = 6

export default function CalendarWeekView({
  deals,
  start,
  onCreated,
}: {
  deals: Deal[]
  start?: string
  onCreated?: () => void
}) {
  const weekDays = useMemo(() => {
    const base = start ? parseISO(start) : new Date()
    return Array.from({ length: 7 }, (_, i) => addDays(base, i))
  }, [start])

  const spans = useMemo(() => {
    if (!weekDays.length) return [] as Span[]
    const weekStart = weekDays[0]
    const spans: Span[] = []

    deals.forEach((ev) => {
      const sIso = pickDateIso(ev, ['DataInici', 'Data'])
      const eIso = pickDateIso(ev, ['DataFi', 'DataInici', 'Data'])
      if (!sIso || !eIso) return

      const sDate = parseISO(sIso)
      const eDate = parseISO(eIso)
      const startIdx = Math.max(0, diffDays(sDate, weekStart))
      const endIdx = Math.min(6, diffDays(eDate, weekStart))
      if (endIdx < 0 || startIdx > 6) return

      spans.push({
        ev,
        startIdx,
        endIdx,
        lane: 0,
      })
    })

    spans.sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx)

    const laneEnds: number[] = []
    spans.forEach((span) => {
      let lane = laneEnds.findIndex((end) => span.startIdx > end)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = span.endIdx
      span.lane = lane
    })

    return spans
  }, [deals, weekDays])

  const maxLane = spans.reduce((m, s) => Math.max(m, s.lane), -1)
  const laneCount = maxLane + 1
  const visibleLaneCount = Math.min(VISIBLE_LANES, laneCount)
  const visibleSpans = spans.filter((s) => s.lane < visibleLaneCount)
  const minHeight = Math.max(220, visibleLaneCount * 34 + 96)

  return (
    <div
      className="
        relative
        bg-gray-300/60 
        rounded-lg 
        overflow-hidden
        w-full
      "
      style={{ minHeight }}
    >
      {/* Capçalera de dies */}
      <div className="grid grid-cols-7 gap-[1px]">
        {weekDays.map((d) => (
          <div
            key={d.toISOString()}
            className="bg-white p-1.5 sm:p-2 min-h-[64px] border-r last:border-r-0"
          >
            <div className="text-[10px] sm:text-sm font-medium text-blue-700">
              {format(d, 'EEE d', { locale: es })}
            </div>
          </div>
        ))}
      </div>

      {/* Franges multi-dia */}
      <div
        className="
          absolute inset-0
          grid grid-cols-7 gap-2
          px-2 pb-2 pt-6
          pointer-events-none
        "
        style={{ gridAutoRows: 'minmax(26px, auto)' }}
      >
        {visibleSpans.map((span, idx) => {
          const isSingleDay = span.startIdx === span.endIdx
          const lnColor: Record<string, string> = {
            Empresa: 'bg-blue-100 text-blue-700 border-blue-300',
            Casaments: 'bg-green-100 text-green-700 border-green-300',
            'Grups Restaurants': 'bg-yellow-100 text-yellow-700 border-yellow-300',
            Foodlovers: 'bg-red-100 text-red-700 border-red-300',
            Agenda: 'bg-gray-100 text-gray-800 border-gray-300',
          }

          const colorClass =
            lnColor[span.ev.LN?.trim() || ''] ||
            'bg-gray-100 text-gray-700 border-gray-300'

          return (
            <CalendarModal
              key={`${span.ev.id}-${idx}`}
              deal={span.ev}
              onSaved={onCreated}
              trigger={
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    pointer-events-auto
                    truncate ${isSingleDay ? 'px-2 py-[2px]' : 'px-2 py-[4px]'}
                    rounded-md border 
                    flex items-center ${isSingleDay ? 'justify-start' : 'justify-center'} gap-2
                    text-[11px] sm:text-[12px] font-medium
                    ${colorClass}
                  `}
                  style={{
                    gridColumn: `${span.startIdx + 1} / ${span.endIdx + 2}`,
                    gridRowStart: span.lane + 1,
                  }}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${dotColor(span.ev)}`} />
                  <span className={`truncate ${isSingleDay ? 'text-left' : 'text-center'}`}>
                    {span.ev.NomEvent}
                  </span>
                </div>
              }
            />
          )
        })}

        {/* Botons +X més per dies amb lanes ocultes */}
        {weekDays.map((d, dayIdx) => {
          const segments = spans
            .filter((s) => s.startIdx <= dayIdx && s.endIdx >= dayIdx)
            .sort((a, b) => a.lane - b.lane)
          const visibleLaneCount = Math.min(VISIBLE_LANES, laneCount)
          const hidden = segments.filter((s) => s.lane >= visibleLaneCount)

          if (!hidden.length) return null

          return (
            <div
              key={`more-${dayIdx}`}
              style={{
                gridColumn: `${dayIdx + 1} / ${dayIdx + 2}`,
                gridRowStart: visibleLaneCount + 1,
              }}
              className="flex items-center pointer-events-auto"
            >
              <MoreEventsPopup date={d} events={hidden.map((h) => h.ev)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MoreEventsPopup({ date, events }: { date: Date; events: Deal[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        className="text-[10px] text-gray-400 italic cursor-pointer hover:text-blue-500"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        +{events.length} més
      </div>

      <DialogContent className="w-[95dvw] max-w-sm sm:max-w-md h-[80dvh] sm:h-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold capitalize">
            Esdeveniments del {format(date, 'EEEE d MMMM', { locale: es })}
          </DialogTitle>
        </DialogHeader>

        <div
          className="space-y-1 mt-2 max-h-[60dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {events.map((ev) => (
            <CalendarModal
              key={`more-${ev.id}`}
              deal={ev}
              trigger={
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="
                    flex items-center gap-2
                    truncate px-1.5 py-[3px]
                    rounded-md border text-[11px] sm:text-[12px]
                    bg-white 
                  "
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor(ev)}`} />
                  <span className="truncate">{ev.NomEvent}</span>
                </div>
              }
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
