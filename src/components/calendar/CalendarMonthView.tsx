// file: src/components/calendar/CalendarMonthView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import CalendarModal from './CalendarModal'
import CalendarNewEventModal from './CalendarNewEventModal'
import type { Deal } from '@/hooks/useCalendarData'
import { colorByLN } from '@/lib/colors'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

function dotColorByCollection(collection?: string) {
  const c = (collection || '').toLowerCase()
  if (c.includes('verd')) return 'bg-green-500'
  if (c.includes('taronja')) return 'bg-amber-500'
  if (c.includes('taronja')) return 'bg-blue-500'
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

  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const anchor =
  start
    ? new Date(start)
    : deals.length
    ? new Date(deals[0].DataInici ?? deals[0].Data ?? new Date())
    : new Date()


  const month = anchor.getMonth()
  const year = anchor.getFullYear()

  const monthLabel = new Date(year, month).toLocaleDateString('ca-ES', {
    month: 'long',
    year: 'numeric',
  })

  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`

  const startOfWeekMon = (d: Date) => {
    const r = new Date(d)
    const off = (d.getDay() + 6) % 7
    r.setDate(d.getDate() - off)
    return r
  }

  const endOfWeekMon = (d: Date) => {
    const r = startOfWeekMon(d)
    r.setDate(r.getDate() + 6)
    return r
  }

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)

    const gridStart = startOfWeekMon(first)
    const gridEnd = endOfWeekMon(last)

    const out: { date: Date; iso: string; isOther: boolean }[][] = []
    const days: { date: Date; iso: string; isOther: boolean }[] = []


    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
      const c = new Date(d)
      days.push({
        date: c,
        iso: toISO(c),
        isOther: c.getMonth() !== month,
      })
    }

 for (let i = 0; i < days.length; i += 7) {
  out.push(days.slice(i, i + 7))
}

    return out
  }, [month, year])

  const getStartISO = (ev: Deal) =>
    (ev.DataInici || ev.Data)?.slice(0, 10) || ''

  const isSameDay = (ev: Deal, iso: string) => getStartISO(ev) === iso

  return (
   <div className="flex flex-col w-full h-auto">


      {/* HEADER MES (mòbil sobrescrit per PageHeader) */}
      <div className="sm:hidden sticky top-0 z-10 bg-white py-3 text-center font-semibold text-lg border-b shadow-sm">
        {monthLabel}
      </div>

      {/* Dies setmana */}
      <div className="grid grid-cols-7 text-[10px] sm:text-xs text-gray-600 bg-gray-50 border-b">
        {['Dl','Dt','Dc','Dj','Dv','Ds','Dg'].map((d) => (
          <div key={d} className="py-1 sm:py-2 text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* GRAELLA */}
      <div className="overflow-visible">

        {weeks.map((week, wIdx) => (
          <div
            key={wIdx}
            className="
              grid grid-cols-7 
              border-b 
              min-h-[12dvh] 
              sm:min-h-[150px]
            "
          >
            {week.map((c) => {
              const allEvents = deals.filter((ev) => isSameDay(ev, c.iso))
              const visible = allEvents.slice(0, 3)
              const hidden = allEvents.length - visible.length

              return (
                <motion.div
                  key={c.iso}
                  onClick={() => !c.isOther && setSelectedDate(c.iso)}
                  whileHover={{ scale: 1.01 }}
                  className={`
                    relative border-r p-1 
                    flex flex-col 
                    ${c.isOther ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  `}
                >
                  {/* DIA */}
                  <span className="absolute top-1 right-1 text-[10px] sm:text-xs text-gray-500">
                    {c.date.getDate()}
                  </span>

                  {/* TARGETES */}
                  <div className="mt-4 sm:mt-6 flex flex-col gap-1 overflow-hidden">
                    {visible.map((ev, i) => (
                      <CalendarModal
                        key={`${ev.id}-${i}`}
                        deal={ev}
                        onSaved={onCreated}
                        trigger={
                          <div
                            className={`
                              flex items-center gap-1 truncate rounded-md 
                              border shadow-sm px-1 py-[2px]
                              text-[10px] sm:text-[12px] 
                              font-medium 
                              ${colorByLN(ev.LN)}
                            `}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${dotColorByCollection(ev.collection)}`}
                            />
                            <span className="truncate">{ev.NomEvent}</span>
                          </div>
                        }
                      />
                    ))}

                    {hidden > 0 && (
                      <MoreEventsPopup events={allEvents.slice(3)} date={c.date} />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>

      {/* MODAL CREAR NOU */}
      {selectedDate && (
        <CalendarNewEventModal
          key={selectedDate}
          date={selectedDate}
          trigger={<div />}
          onSaved={() => {
            setSelectedDate(null)
            onCreated?.()
          }}
        />
      )}
    </div>
  )
}

function MoreEventsPopup({ events, date }: { events: Deal[]; date: Date }) {
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

      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {date.toLocaleDateString('ca-ES', {
              day: 'numeric',
              month: 'long',
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-[60dvh] overflow-y-auto">
          {events.map((ev) => (
            <CalendarModal
              key={ev.id}
              deal={ev}
              trigger={
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`
                    flex items-center gap-2 
                    truncate px-1.5 py-[3px] rounded-md border
                    text-[11px] sm:text-[12px]
                    ${colorByLN(ev.LN)}
                  `}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${dotColorByCollection(ev.collection)}`}
                  />
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
