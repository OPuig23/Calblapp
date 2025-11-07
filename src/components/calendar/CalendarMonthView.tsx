'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import CalendarNewEventModal from './CalendarNewEventModal'
import type { Deal } from '@/hooks/useCalendarData'
import { colorByLN } from '@/lib/colors'

// 🔹 Funció per pintar el punt segons col·lecció
function dotColorByCollection(collection?: string) {
  const c = (collection || '').toLowerCase()
  if (c.includes('verd')) return 'bg-green-500'
  if (c.includes('taronja')) return 'bg-amber-500'
  if (c.includes('blau')) return 'bg-blue-500'
  return 'bg-gray-300'
}

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
console.log(
    '🎨 Col·leccions rebudes:',
    [...new Set(deals.map((d) => d.collection))] // mostra una sola vegada cada tipus
  )

  // ───────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const anchor =
    start
      ? new Date(start)
      : deals.length > 0
      ? new Date(deals[0].DataInici || deals[0].Data || new Date())
      : new Date()

  const currentMonth = anchor.getMonth()
  const currentYear = anchor.getFullYear()

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ca-ES', {
    month: 'long',
    year: 'numeric',
  })

  // ───────────────────────────────
  // Utils per dates
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`

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

  // ───────────────────────────────
  // Genera graella de dies
  const weeks = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1)
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0)
    const gridStart = startOfWeekMon(firstOfMonth)
    const gridEnd = endOfWeekMon(lastOfMonth)

    const days: { date: Date; iso: string; isOther: boolean }[] = []
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const copy = new Date(d)
      days.push({
        date: copy,
        iso: toISO(copy),
        isOther: copy.getMonth() !== currentMonth,
      })
    }

    const w: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7))
    return w
  }, [currentMonth, currentYear])

  // ───────────────────────────────
  // Helpers
  const getEventStartISO = (ev: Deal) => (ev.DataInici || ev.Data)?.slice(0, 10) || ''
  const isSameDay = (ev: Deal, iso: string) => getEventStartISO(ev) === iso

  // ───────────────────────────────
  // 🖼️ Render
  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      {/* Header mes */}
      <div className="sticky top-0 z-10 bg-white py-3 text-center text-lg font-semibold capitalize shadow-sm border-b">
        {monthName}
      </div>

      {/* Dies setmana */}
      <div className="grid grid-cols-7 text-[11px] sm:text-xs text-gray-600 bg-gray-50 border-b">
        {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map((d) => (
          <div key={d} className="py-2 text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Setmanes */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 min-h-[13vh] border-b">
            {week.map((cell) => {
              const dailyEvents = deals.filter((ev) => isSameDay(ev, cell.iso)).slice(0, 4)
              const hiddenEvents = deals.filter((ev) => isSameDay(ev, cell.iso)).length - dailyEvents.length

              return (
                <motion.div
                  key={cell.iso}
                  onClick={() => !cell.isOther && setSelectedDate(cell.iso)}
                  whileHover={{ scale: 1.02 }}
                  className={`relative border-r flex flex-col p-1 sm:p-1.5 ${
                    cell.isOther ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  }`}
                  style={{ minHeight: '12vh' }}
                >
                  {/* Dia */}
                  <div className="absolute top-1 right-2 text-[11px] sm:text-xs text-gray-500">
                    {cell.date.getDate()}
                  </div>

                  {/* Esdeveniments */}
                  <div className="flex flex-col gap-[3px] mt-5 sm:mt-6 overflow-hidden">
                    {dailyEvents.map((ev, i) => (
                      <CalendarModal
                        key={i}
                        deal={ev}
                        onSaved={onCreated}
                        trigger={
                          <div
                            className={`flex items-center gap-2 truncate rounded-md border shadow-sm px-1.5 py-[3px] text-[11px] sm:text-[12px] font-medium ${colorByLN(
                              ev.LN
                            )}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${dotColorByCollection(ev.collection)}`}
                            ></span>
                            <span className="truncate">{ev.NomEvent}</span>
                          </div>
                        }
                      />
                    ))}

                    {hiddenEvents > 0 && (
                      <MoreEventsPopup date={cell.date} events={deals.filter((ev) => isSameDay(ev, cell.iso)).slice(4)} />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Modal nou esdeveniment */}
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

// ───────────────────────────────
// 🔹 Popup +X més
// ───────────────────────────────
function MoreEventsPopup({ date, events }: { date: Date; events: Deal[] }) {
  const [open, setOpen] = useState(false)
  const dayLabel = date.toLocaleDateString('ca-ES', {
    day: 'numeric',
    month: 'long',
  })

  return (
    <Dialog open={open} onOpenChange={(val) => setTimeout(() => setOpen(val), 10)}>
      <div
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="text-[11px] text-gray-400 italic cursor-pointer hover:text-blue-500"
      >
        +{events.length} més
      </div>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Esdeveniments del {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 mt-2 max-h-[300px] overflow-y-auto">
          {events.map((ev, eIdx) => (
            <CalendarModal
              key={eIdx}
              deal={ev}
              trigger={
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-2 truncate rounded-md border shadow-sm px-1.5 py-[3px] text-[11px] font-medium ${colorByLN(
                    ev.LN
                  )}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${dotColorByCollection(ev.collection)}`}
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
