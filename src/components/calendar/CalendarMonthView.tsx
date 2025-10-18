//file: src/components/calendar/CalendarMonthView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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
  start?: string // yyyy-MM-dd
  end?: string   // yyyy-MM-dd
  onCreated?: () => void
}) {
  // Derivem mes/any del start rebut; si no existeix, fem servir avui
  const anchor = start ? new Date(start) : new Date()
  const currentMonth = anchor.getMonth()
  const currentYear = anchor.getFullYear()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // 🧮 Generació de dies (35 cel·les) i assignació d’esdeveniments per dia
  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const totalDays = lastDay.getDate()
    const startOffset = (firstDay.getDay() + 6) % 7 // dilluns=0
    const cells: { date: Date; isOther: boolean; events?: Deal[] }[] = []

    // Dies del mes anterior
    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startOffset; i > 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLast - i + 1)
      cells.push({ date, isOther: true })
    }

    // Dies del mes actual
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const iso = toISO(date)
      const events = deals.filter((d) => {
        const s = (d.DataInici || d.Data)?.slice(0, 10)
        const e = (d.DataFi || d.DataInici || d.Data)?.slice(0, 10)
        return s && e && iso >= s && iso <= e
      })
      cells.push({ date, isOther: false, events })
    }

    // Completar fins a 35 cel·les
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
      {/* Títol (navegació ja està als filtres) */}
      <h2 className="text-base font-semibold text-center capitalize">{monthName}</h2>

      {/* GRID DIES */}
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

              {!d.isOther && d.events?.length ? (
                <div className="space-y-0.5 overflow-hidden">
                 {d.events.slice(0, 2).map((ev) => {
  // 🎨 Assignem color segons la línia de negoci (Pipeline)
  const colorByPipeline: Record<string, string> = {
    Empresa: 'bg-blue-100 text-blue-700 border-blue-400',
    Casament: 'bg-pink-100 text-pink-700 border-pink-400',
    'Grups Restaurants': 'bg-green-100 text-green-700 border-green-400',
    Foodlover: 'bg-red-100 text-red-700 border-red-400',
    Agenda: 'bg-yellow-100 text-yellow-700 border-yellow-400',
  }

  const colorClass =
    colorByPipeline[ev.Servei?.trim() || ''] ||
    'bg-gray-100 text-gray-700 border-gray-300'

  return (
    <CalendarModal
      key={ev.id}
      deal={ev}
      trigger={
        <div
          onClick={(e) => e.stopPropagation()}
          className={`truncate px-1.5 py-[2px] rounded-md border ${colorClass} flex items-center gap-1 text-[11px] sm:text-[12px] font-medium`}
          title={`${ev.NomEvent} — ${ev.Servei}`}
        >
          <span className="truncate">{ev.NomEvent}</span>
        </div>
      }
    />
  )
})}


                </div>
              ) : (
                !d.isOther && <div className="flex-1 text-gray-200 text-[9px]">—</div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* MODAL NOU ESDEVENIMENT (click buit del dia) */}
      {selectedDate && (
        <CalendarNewEventModal
  key={selectedDate} // ✅ força un nou render únic per data
  defaultDate={selectedDate}
  autoOpen={!!selectedDate} // ✅ només si hi ha data
  onCreated={() => {
    onCreated?.()
    setSelectedDate(null)
  }}
/>

      )}
    </div>
  )
}
