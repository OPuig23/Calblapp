// ✅ file: src/components/calendar/CalendarMonthView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import CalendarNewEventModal from './CalendarNewEventModal'
import type { Deal } from '@/hooks/useCalendarData'
import { colorByLN } from '@/lib/colors'
import { colorByStage } from '@/lib/colors'



type Cell = { date: Date; iso: string; isOther: boolean }
type Week = Cell[]

export default function CalendarMonthView({
  
  deals,
  start,
  end,
  onCreated,
}: {
  deals: Deal[]
  start?: string
  end?: string
  onCreated?: () => void
}) {
  console.log('📊 CalendarMonthView → deals rebuts:', deals.length)
deals.forEach(d => {
  console.log(`🗓️ ${d.id} | ${d.NomEvent} | ${d.LN} | ${d.DataInici} → ${d.DataFi}`)
})

  // ───────────────────────────────────────────────
  // 📅 Utils
  // ───────────────────────────────────────────────
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`

  const dowMon1 = (d: Date) => ((d.getDay() + 6) % 7) + 1
  const startOfWeekMon = (d: Date) => {
    const r = new Date(d)
    const off = (d.getDay() + 6) % 7
    r.setDate(d.getDate() - off)
    r.setHours(0, 0, 0, 0)
    return r
  }
  const endOfWeekMon = (d: Date) => {
    const r = startOfWeekMon(d)
    r.setDate(r.getDate() + 6)
    return r
  }

  const daysBetweenInclusive = (a: Date, b: Date) =>
    Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // ───────────────────────────────────────────────
  // 🔁 Estat i context
  // ───────────────────────────────────────────────
  const anchor =
  start
    ? new Date(start)
    : deals.length > 0
    ? new Date(deals[0].DataInici || deals[0].Data || new Date())
    : new Date()

  const currentMonth = anchor.getMonth()
  const currentYear = anchor.getFullYear()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ca-ES', {
    month: 'long',
    year: 'numeric',
  })

  // ───────────────────────────────────────────────
  // 🧮 Graella del mes
  // ───────────────────────────────────────────────
  const weeks: Week[] = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1)
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0)
    const gridStart = startOfWeekMon(firstOfMonth)
    const gridEnd = endOfWeekMon(lastOfMonth)

    const days: Cell[] = []
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const copy = new Date(d)
      const iso = toISO(copy)
      const isOther = copy.getMonth() !== currentMonth
      days.push({ date: copy, iso, isOther })
    }

    const w: Week[] = []
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7))
    return w
  }, [currentMonth, currentYear])

  
  // ───────────────────────────────────────────────
  // ⚙️ StageGroup Weight
  // ───────────────────────────────────────────────
  const stageWeight = (stage?: string) => {
    const s = (stage || '').toLowerCase()
    if (s.includes('confirmat') || s.includes('ganada')) return 1
    if (s.includes('proposta') || s.includes('pendent')) return 2
    return 3
  }

  // ───────────────────────────────────────────────
  // Helpers d’esdeveniments
  // ───────────────────────────────────────────────
  const getEventStartISO = (ev: Deal) =>
    (ev.DataInici || ev.Data)?.slice(0, 10) || null
  const getEventEndISO = (ev: Deal) =>
    (ev.DataFi || ev.DataInici || ev.Data)?.slice(0, 10) || null

// ✅ Funcions robustes de dates per evitar desfasos UTC i errors amb format curt
const parseDate = (d?: string | null) => {
  if (!d) return null
  const normalized = d.length === 10 ? `${d}T00:00:00` : d
  return new Date(normalized)
}

const overlaps = (ev: Deal, rangeStart: Date, rangeEnd: Date) => {
  const s = parseDate(ev.DataInici || ev.Data)
  const e = parseDate(ev.DataFi || ev.DataInici || ev.Data)
  if (!s || !e) return false
  return s <= rangeEnd && e >= rangeStart
}

const isInCurrentMonth = (ev: Deal) => {
  const s = parseDate(ev.DataInici || ev.Data)
  const e = parseDate(ev.DataFi || ev.DataInici || ev.Data)
  if (!s || !e) return false
  return s.getMonth() === currentMonth || e.getMonth() === currentMonth
}


  const isMultiDay = (ev: Deal) => {
    const s = getEventStartISO(ev)
    const e = getEventEndISO(ev)
    return !!(s && e && s !== e)
  }

  // ───────────────────────────────────────────────
  // 🖼️ Render
  // ───────────────────────────────────────────────
  return (
    <div className="space-y-2 sm:space-y-3 overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 py-2 text-center font-semibold capitalize shadow-sm">
        {monthName}
      </div>

      <div className="grid grid-cols-7 text-[10px] sm:text-xs text-gray-600 select-none bg-gray-50">
        {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map((d) => (
          <div key={d} className="text-center py-1 font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-[2px]">
        {weeks.map((week, wIdx) => {
          const weekStart = new Date(week[0].iso)
          const weekEnd = new Date(week[6].iso)
          const weekEvents = deals
            .filter(isInCurrentMonth)
            .filter((ev) => overlaps(ev, weekStart, weekEnd))
            .sort((a, b) => stageWeight(a.StageGroup) - stageWeight(b.StageGroup))

          // Agrupar esdeveniments d’un sol dia (límit 5)
          const eventsByDay: Record<string, Deal[]> = {}
          weekEvents.forEach((ev) => {
            const sISO = getEventStartISO(ev)
            const eISO = getEventEndISO(ev)
            if (!sISO || !eISO) return
            if (sISO === eISO) {
              if (!eventsByDay[sISO]) eventsByDay[sISO] = []
              eventsByDay[sISO].push(ev)
            }
          })

          return (
            <div key={`week-${wIdx}`} className="relative border-b border-gray-100">
              {/* Graella de dies */}
              <div className="grid grid-cols-7">
                {week.map((cell) => {
                  const dailyEvents = eventsByDay[cell.iso]?.slice(0, 5) || []
                  const hiddenEvents =
                    (eventsByDay[cell.iso]?.length || 0) - dailyEvents.length

                  return (
                    <motion.div
                      key={cell.iso}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.dialog-content')) return
                        if (!cell.isOther) setSelectedDate(cell.iso)
                      }}
                      whileHover={{ scale: 1.02 }}
                      className={`relative border rounded-md flex flex-col justify-start p-1.5 transition 
                        ${cell.isOther ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white hover:bg-blue-50 cursor-pointer'}
                      `}
                      style={{ aspectRatio: '1 / 1', minHeight: 'calc(100vh / 6)' }}
                      tabIndex={0}
                    >
                      <div className="absolute top-0 right-1 text-[10px] sm:text-xs text-gray-500 z-[30]">
                        {cell.date.getDate()}
                      </div>

                      <div className="flex flex-col gap-[2px] mt-4 overflow-hidden pointer-events-none">
                        {dailyEvents.map((ev, i) => (
                          <div key={i} className="pointer-events-auto">
                            <CalendarModal
                              deal={ev}
                              onSaved={onCreated}
                              trigger={
                                <div
                                  className={`truncate px-1 py-[2px] rounded-md border shadow-sm ${colorByLN(
                                    ev.LN
                                  )} flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold`}
                                  title={`${ev.NomEvent} — ${ev.LN || '—'}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span
  className={`inline-block w-2 h-2 rounded-full ${colorByStage(ev.StageGroup)}`}
></span>

                                  <span className="truncate">{ev.NomEvent}</span>
                                </div>
                              }
                            />
                          </div>
                        ))}

                        {hiddenEvents > 0 && (
                          <div className="pointer-events-auto">
                            <MoreEventsPopup
                              date={cell.date}
                              events={eventsByDay[cell.iso].slice(5)}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Franges multijornada */}
              <div className="absolute inset-0 grid grid-cols-7 gap-x-[2px] gap-y-[3px] p-1 pointer-events-none z-[10]">
                {weekEvents.filter(isMultiDay).map((ev, idx) => {
                  const sISO = getEventStartISO(ev)!
                  const eISO = getEventEndISO(ev)!
                  const s = new Date(sISO)
                  const e = new Date(eISO)

                  const clampedStart = s < weekStart ? weekStart : s
                  const clampedEnd = e > weekEnd ? weekEnd : e

                  const startCol = dowMon1(clampedStart)
                  const spanDays = daysBetweenInclusive(clampedStart, clampedEnd)
                  const row = (idx % 4) + 1
                  const showName =
                    sISO >= toISO(weekStart) && sISO <= toISO(weekEnd)
                  const colorClass = colorByLN(ev.LN)

                  return (
                    <div
                      key={`${ev.id || ev.NomEvent}-${wIdx}-lane-${idx}`}
                      className="pointer-events-auto"
                      style={{
                        gridRowStart: row,
                        gridColumn: `${startCol} / span ${spanDays}`,
                      }}
                    >
                      <CalendarModal
                        deal={ev}
                        onSaved={onCreated}
                        trigger={
                          <div
                            className={`truncate px-1.5 py-[2px] rounded-md border shadow-sm ${colorClass} flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold`}
                            onClick={(e) => e.stopPropagation()}
                            title={`${ev.NomEvent} — ${ev.LN || '—'}`}
                          >
                            <span
  className={`inline-block w-2 h-2 rounded-full ${colorByStage(ev.StageGroup)}`}
></span>

                            <span className="truncate">
                              {showName ? ev.NomEvent : ''}
                            </span>
                          </div>
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <CalendarNewEventModal
          key={selectedDate}
          date={selectedDate}
          trigger={<div />}
          onSaved={() => {
            onCreated?.()
            setSelectedDate(null)
          }}
        />
      )}
    </div>
  )
}

// ───────────────────────────────────────────────
// 🔹 Submodal +X més
// ───────────────────────────────────────────────
function MoreEventsPopup({ date, events }: { date: Date; events: Deal[] }) {
  const [open, setOpen] = useState(false)
  const dayLabel = date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })

  const ordered = [...events].sort((a, b) => a.StageGroup.localeCompare(b.StageGroup))

  return (
    <Dialog open={open} onOpenChange={(val) => setTimeout(() => setOpen(val), 10)}>
      <div
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="text-[10px] text-gray-400 italic cursor-pointer hover:text-blue-500"
      >
        +{events.length} més
      </div>

      <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Esdeveniments del {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div
          className="space-y-1 mt-2 max-h-[300px] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {ordered.map((ev) => (
            <CalendarModal
              key={ev.id}
              deal={ev}
              trigger={
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`truncate px-1.5 py-[3px] rounded-md border shadow-sm ${colorByLN(
                    ev.LN
                  )} flex items-center gap-1 text-[11px] font-medium`}
                  title={`${ev.NomEvent} — ${ev.LN || '—'}`}
                >
                  <span
  className={`inline-block w-2 h-2 rounded-full ${colorByStage(ev.StageGroup)}`}
></span>

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