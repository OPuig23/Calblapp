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
const VISIBLE_LANES_MOBILE = 4
const BREAKPOINT_TABLET = 1024
const BREAKPOINT_MOBILE = 640

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
  if (c.includes('groc')) return 'bg-yellow-500'
  if (c.includes('blau')) return 'bg-blue-500'
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
  const [layout, setLayout] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < BREAKPOINT_MOBILE) return setLayout('mobile')
      if (w < BREAKPOINT_TABLET) return setLayout('tablet')
      return setLayout('desktop')
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const weekDays = useMemo(() => {
    const base = start ? parseISO(start) : new Date()
    const daysCount = layout === 'mobile' ? 3 : layout === 'tablet' ? 5 : 7
    return Array.from({ length: daysCount }, (_, i) => addDays(base, i))
  }, [start, layout])


  const spans = useMemo(() => {
    if (!weekDays.length) return [] as Span[]
    const weekStart = weekDays[0]
    const spans: Span[] = []
    const lastDayIdx = weekDays.length - 1

    deals.forEach((ev) => {
      const sIso = pickDateIso(ev, ['DataInici', 'Data'])
      const eIso = pickDateIso(ev, ['DataFi', 'DataInici', 'Data'])
      if (!sIso || !eIso) return

      const sDate = parseISO(sIso)
      const eDate = parseISO(eIso)
      const startIdx = Math.max(0, diffDays(sDate, weekStart))
      const endIdx = Math.min(lastDayIdx, diffDays(eDate, weekStart))
      if (endIdx < 0 || startIdx > lastDayIdx) return

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
  const laneLimit = layout === 'mobile' ? VISIBLE_LANES_MOBILE : VISIBLE_LANES_DESKTOP
  const visibleLaneCount = Math.min(laneLimit, laneCount)
  const visibleSpans = spans.filter((s) => s.lane < visibleLaneCount)

  const baseHeight =
    layout === 'mobile' ? 200 : layout === 'tablet' ? 230 : 260
  const rowHeight =
    layout === 'mobile' ? 36 : layout === 'tablet' ? 42 : 48
  const paddingExtra = layout === 'mobile' ? 60 : layout === 'tablet' ? 90 : 120
  const minHeight = Math.max(baseHeight, visibleLaneCount * rowHeight + paddingExtra)
  const minColWidth =
    layout === 'mobile' ? 140 : layout === 'tablet' ? 155 : 170


  const weekCells = weekDays.map((d) => ({
    date: d,
    iso: d.toISOString().slice(0, 10),
  }))

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div
        className="relative min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:min-w-0"
        style={{ minHeight }}
      >
        {/* Header */}
        <div
          className="grid border-b bg-slate-50 text-[10px] text-gray-600 sm:text-xs"
          style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(${minColWidth}px, 1fr))` }}
        >
          {weekDays.map((d) => (
            <div key={d.toISOString()} className="py-1 text-center font-medium sm:py-2">
              {format(d, 'EEE d', { locale: es })}
            </div>
          ))}
        </div>

        {/* Cells + events */}
        <div
          className="relative grid bg-gray-50"
          style={{ gridTemplateColumns: `repeat(${weekDays.length}, minmax(${minColWidth}px, 1fr))` }}
        >
          {weekCells.map((c) => (
            <div
              key={c.iso}
              className="relative border-r bg-white"
              style={{ minHeight }}
            />
          ))}

          <div
            className={`pointer-events-none absolute inset-0 grid ${
              layout === 'mobile' ? 'gap-1.5 px-1.5 pb-2 pt-4' : 'gap-2 px-2 pb-2 pt-6'
            }`}
            style={{
              gridTemplateColumns: `repeat(${weekDays.length}, minmax(${minColWidth}px, 1fr))`,
              gridAutoRows: layout === 'mobile' ? 'minmax(32px, auto)' : 'minmax(38px, auto)',
            }}
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
                        pointer-events-auto whitespace-normal
                        ${isSingleDay ? 'px-2 py-[2px]' : 'px-2 py-[4px]'}
                        rounded-md border 
                        flex items-center gap-2
                        text-[11px] sm:text-[12px]  font-medium
                        ${colorByLN(span.ev.LN)}
                      `}
                      style={{
                        gridColumn: `${span.startIdx + 1} / ${span.endIdx + 2}`,
                        gridRowStart: span.lane + 1,
                      }}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${dotColorByCollection(span.ev.collection)}`}
                      />
                      <span className="min-w-0 flex-1 text-left leading-tight line-clamp-2">
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
        className="cursor-pointer text-[10px] italic text-gray-400 hover:text-blue-500"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        +{events.length} més
      </div>

      <DialogContent className="h-[80dvh] w-[95dvw] max-w-sm sm:h-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold capitalize">
            Esdeveniments del {format(date, 'EEEE d MMMM', { locale: es })}
          </DialogTitle>
        </DialogHeader>

        <div
          className="mt-2 max-h-[60dvh] space-y-1 overflow-y-auto"
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
                    flex items-center gap-2 truncate
                    rounded-md border bg-white px-1.5 py-[3px]
                    text-[11px] sm:text-[12px]
                  "
                >
                  <span className={`h-2 w-2 rounded-full ${dotColorByCollection(ev.collection)}`} />
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
