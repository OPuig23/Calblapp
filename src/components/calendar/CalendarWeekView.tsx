// file: src/components/calendar/CalendarWeekView.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'
import { colorByLN } from '@/lib/colors'

const VISIBLE_LANES_DESKTOP = 6
const VISIBLE_LANES_MOBILE = 3

const diffDays = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000))

const pickDateIso = (ev: Deal, keys: string[]) => {
  for (const k of keys) {
    const v = (ev as any)?.[k]
    if (typeof v === 'string' && v.length >= 10) return v.slice(0, 10)
  }
  return ''
}

function dotColorByCollection(collection?: string) {
  const c = (collection || '').toLowerCase()
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

export default function CalendarWeekView({
  deals,
  start,
  onCreated,
}: {
  deals: Deal[]
  start?: string
  onCreated?: () => void
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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
  const laneLimit = isMobile ? VISIBLE_LANES_MOBILE : VISIBLE_LANES_DESKTOP
  const visibleLaneCount = Math.min(laneLimit, laneCount)
  const visibleSpans = spans.filter((s) => s.lane < visibleLaneCount)
  console.debug('[CalendarWeekView] deals', deals.length, 'spans', spans.length, 'visible', visibleSpans.length, { start })

  const minHeight = Math.max(240, visibleLaneCount * 44 + 120)
  const minColWidth = isMobile ? 110 : 150

  const weekCells = weekDays.map((d) => ({
    date: d,
    iso: d.toISOString().slice(0, 10),
  }))

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div
        className="relative bg-white rounded-lg overflow-hidden min-w-full md:min-w-[1024px] lg:min-w-[1120px] sm:min-w-0 border border-slate-200 shadow-sm"
        style={{ minHeight }}
      >
        {/* Header */}
        <div
          className="grid grid-cols-7 text-[10px] sm:text-xs text-gray-600 bg-slate-50 border-b"
          style={{ gridTemplateColumns: `repeat(7, minmax(${minColWidth}px, 1fr))` }}
        >
          {weekDays.map((d) => (
            <div key={d.toISOString()} className="py-1 sm:py-2 text-center font-medium">
              {format(d, 'EEE d', { locale: es })}
            </div>
          ))}
        </div>

        {/* Cells + events */}
        <div
          className="relative grid grid-cols-7 bg-gray-50"
          style={{ gridTemplateColumns: `repeat(7, minmax(${minColWidth}px, 1fr))` }}
        >
          {weekCells.map((c) => (
            <div
              key={c.iso}
              className="relative border-r bg-white min-h-[160px]"
              style={{ minHeight }}
            />
          ))}

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
                        text-[10px] sm:text-[12px] font-medium
                        ${colorByLN(span.ev.LN)}
                      `}
                      style={{
                        gridColumn: `${span.startIdx + 1} / ${span.endIdx + 2}`,
                        gridRowStart: span.lane + 1,
                      }}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${dotColorByCollection(span.ev.collection)}`}
                      />
                      <span className={`truncate ${isSingleDay ? 'text-left' : 'text-center'}`}>
                        {span.ev.NomEvent}
                      </span>
                    </div>
                  }
                />
              )
            })}

            {weekDays.map((d, dayIdx) => {
              const segments = spans
                .filter((s) => s.startIdx <= dayIdx && s.endIdx >= dayIdx)
                .sort((a, b) => a.lane - b.lane)
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
                  <span className={`w-2 h-2 rounded-full ${dotColorByCollection(ev.collection)}`} />
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
