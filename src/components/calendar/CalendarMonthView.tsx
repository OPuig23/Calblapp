//file: src/components/calendar/CalendarMonthView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import CalendarNewEventModal from './CalendarNewEventModal'
import type { Deal } from '@/hooks/useCalendarData'

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
  const anchor = start ? new Date(start) : new Date()
  const currentMonth = anchor.getMonth()
  const currentYear = anchor.getFullYear()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 🧮 Generació de dies i ordenació d’esdeveniments
  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const totalDays = lastDay.getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: { date: Date; isOther: boolean; events?: Deal[] }[] = []

    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startOffset; i > 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLast - i + 1)
      cells.push({ date, isOther: true })
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const iso = toISO(date)
      const events = deals
        .filter((d) => {
          const s = (d.DataInici || d.Data)?.slice(0, 10)
          const e = (d.DataFi || d.DataInici || d.Data)?.slice(0, 10)
          return s && e && iso >= s && iso <= e
        })
        // 🟩 Ordenem: verd > taronja > blau
        .sort((a, b) => {
          const order = { verd: 1, taronja: 2, blau: 3 }
          const normalize = (stage?: string) => {
            const s = stage?.toLowerCase() || ''
            if (s.includes('confirmat') || s.includes('ganada')) return 'verd'
            if (s.includes('proposta') || s.includes('pendent')) return 'taronja'
            return 'blau'
          }
          return order[normalize(a.StageGroup)] - order[normalize(b.StageGroup)]
        })

      cells.push({ date, isOther: false, events })
    }

    const totalCells = cells.length
    const extra = 35 - totalCells
    for (let i = 1; i <= extra; i++) {
      const date = new Date(currentYear, currentMonth + 1, i)
      cells.push({ date, isOther: true })
    }

    return cells
  }, [currentMonth, currentYear, deals])

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('ca-ES', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-center capitalize">{monthName}</h2>

      <div className="grid grid-cols-7 text-[10px] sm:text-xs text-gray-700 select-none">
        {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map((d) => (
          <div key={d} className="text-center font-medium text-blue-600 py-1">
            {d}
          </div>
        ))}

        {days.map((d) => {
          const iso = toISO(d.date)
          return (
            <motion.div
              key={iso}
              onClick={() => !d.isOther && setSelectedDate(iso)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className={`relative border border-gray-200 flex flex-col p-1 sm:p-1.5 transition 
                ${d.isOther ? 'bg-gray-50 text-gray-300' : 'bg-white hover:bg-blue-50 cursor-pointer'}
              `}
              style={{
                aspectRatio: '1 / 1',
                minHeight: 'calc(100vh / 6)',
              }}
            >
              <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5">{d.date.getDate()}</div>

              {/* Esdeveniments del dia */}
              {!d.isOther && d.events?.length ? (
                <div className="space-y-0.5 overflow-hidden">
                  {d.events.slice(0, 5).map((ev) => {
                    const colorByLN: Record<string, string> = {
                      Empresa: 'bg-blue-100 text-blue-700 border-blue-400',
                      Casament: 'bg-green-100 text-green-700 border-green-400',
                      Casaments: 'bg-green-100 text-green-700 border-green-400',
                      Bodas: 'bg-green-100 text-green-700 border-green-400',
                      Boda: 'bg-green-100 text-green-700 border-green-400',
                      'Grups Restaurants': 'bg-yellow-100 text-yellow-700 border-yellow-400',
                      Foodlover: 'bg-red-100 text-red-700 border-red-400',
                      Foodlovers: 'bg-red-100 text-red-700 border-red-400',
                      Agenda: 'bg-grey-100 text-grey-700 border-grey-400',
                    }

                    const colorClass =
                      colorByLN[ev.LN?.trim() || ''] ||
                      'bg-gray-100 text-gray-700 border-gray-300'

                    return (
                      <CalendarModal
                        key={ev.id}
                        deal={ev}
                        trigger={
                          <div
                            onClick={(e) => e.stopPropagation()} // evita obrir nou modal
                            className={`truncate px-1.5 py-[2px] rounded-md border ${colorClass} flex items-center gap-1 text-[11px] sm:text-[12px] font-medium`}
                            title={`${ev.NomEvent} — ${ev.LN}`}
                          >
                            {ev.StageDot && (
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${ev.StageDot}`}
                              ></span>
                            )}
                            <span className="truncate">{ev.NomEvent}</span>
                          </div>
                        }
                      />
                    )
                  })}

                  {/* Si hi ha més de 5, mostra “+X més” */}
                  {d.events.length > 5 && (
                    <MoreEventsPopup date={d.date} events={d.events.slice(5)} />
                  )}
                </div>
              ) : (
                !d.isOther && <div className="flex-1 text-gray-200 text-[9px]">—</div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* MODAL NOU ESDEVENIMENT */}
      {selectedDate && (
        <CalendarNewEventModal
          key={selectedDate}
          defaultDate={selectedDate}
          autoOpen={!!selectedDate}
          onCreated={() => {
            onCreated?.()
            setSelectedDate(null)
          }}
        />
      )}
    </div>
  )
}

// 📅 Submodal per mostrar els esdeveniments addicionals sense disparar el modal nou
function MoreEventsPopup({ date, events }: { date: Date; events: any[] }) {
  const [open, setOpen] = useState(false)
  const dayLabel = date.toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })

  // 🟩 Ordenem igual que a la vista principal
  const orderedEvents = [...events].sort((a, b) => {
    const order = { verd: 1, taronja: 2, blau: 3 }
    const normalize = (stage?: string) => {
      const s = stage?.toLowerCase() || ''
      if (s.includes('confirmat') || s.includes('ganada')) return 'verd'
      if (s.includes('proposta') || s.includes('pendent')) return 'taronja'
      return 'blau'
    }
    return order[normalize(a.StageGroup)] - order[normalize(b.StageGroup)]
  })

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // 🔒 Evita disparar el modal nou quan es tanca
      setTimeout(() => setOpen(val), 10)
    }}>
      <div
        onClick={(e) => {
          e.stopPropagation() // bloqueja modal nou
          setOpen(true)
        }}
        className="text-[10px] text-gray-400 italic cursor-pointer hover:text-blue-500"
      >
        +{events.length} més
      </div>

      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()} // ❌ evita modal nou
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Esdeveniments del {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div
          className="space-y-1 mt-2 max-h-[300px] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // ❌ bloqueja modal nou
        >
          {orderedEvents.map((ev) => {
            const colorByLN: Record<string, string> = {
              Empresa: 'bg-blue-100 text-blue-700 border-blue-400',
              Casaments: 'bg-green-100 text-green-700 border-green-400',
              'Grups Restaurants': 'bg-yellow-100 text-yellow-700 border-yellow-400',
              Foodlover: 'bg-red-100 text-red-700 border-red-400',
              Agenda: 'bg-grey-100 text-grey-700 border-grey-400',
            }

            const colorClass =
              colorByLN[ev.LN?.trim() || ''] ||
              'bg-gray-100 text-gray-700 border-gray-300'

            return (
              <CalendarModal
                key={ev.id}
                deal={ev}
                trigger={
                  <div
                    onClick={(e) => e.stopPropagation()} // ❌ evita modal nou
                    className={`truncate px-1.5 py-[3px] rounded-md border ${colorClass} flex items-center gap-1 text-[11px] sm:text-[12px] font-medium`}
                    title={`${ev.NomEvent} — ${ev.LN}`}
                  >
                    {ev.StageDot && (
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${ev.StageDot}`}
                      ></span>
                    )}
                    <span className="truncate">{ev.NomEvent}</span>
                  </div>
                }
              />
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
