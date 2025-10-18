'use client'

import React, { useMemo } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import CalendarModal from './CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'

export default function CalendarWeekView({
  deals,
  start,
  end,
  onCreated, // reservat per simetria amb MonthView
}: {
  deals: Deal[]
  start?: string // yyyy-MM-dd (dilluns)
  end?: string   // yyyy-MM-dd (diumenge)
  onCreated?: () => void
}) {
  const weekDays = useMemo(() => {
    const base = start ? parseISO(start) : new Date()
    return Array.from({ length: 7 }, (_, i) => addDays(base, i))
  }, [start])

  const groups = useMemo(() => {
    const byDay: Record<string, Deal[]> = {}
    weekDays.forEach((d) => (byDay[format(d, 'yyyy-MM-dd')] = []))
    deals.forEach((ev) => {
      const s = (ev.DataInici || ev.Data)?.slice(0, 10)
      const e = (ev.DataFi || ev.DataInici || ev.Data)?.slice(0, 10)
      if (!s || !e) return
      // Per cada dia de la setmana, si solapa, afegeix
      weekDays.forEach((d) => {
        const iso = format(d, 'yyyy-MM-dd')
        if (!(e < iso || s > iso)) byDay[iso]?.push(ev)
      })
    })
    return byDay
  }, [deals, weekDays])

  return (
    <div className="grid grid-cols-7 gap-[1px] bg-gray-200 rounded-lg overflow-hidden">
      {weekDays.map((d) => {
        const iso = format(d, 'yyyy-MM-dd')
        const items = groups[iso] || []
        return (
          <div key={iso} className="bg-white min-h-[160px] sm:min-h-[220px] p-2">
            <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">
              {format(d, 'EEE d', { locale: es })}
            </div>

            {items.length ? (
              <div className="flex flex-col gap-1">
                {items.slice(0, 6).map((ev) => (
                  <CalendarModal
                    key={`${iso}-${ev.id}`}
                    deal={ev}
                    trigger={
                      <div
                        className={`text-[11px] sm:text-[12px] truncate px-2 py-1 rounded-md ${ev.Color} flex items-center gap-1`}
                        title={`${ev.NomEvent} — ${ev.Servei}`}
                      >
                        {ev.StageDot && <span className={`w-1.5 h-1.5 rounded-full ${ev.StageDot}`} />}
                        <span className="truncate">{ev.NomEvent}</span>
                      </div>
                    }
                  />
                ))}
                {items.length > 6 && (
                  <div className="text-[10px] text-gray-500">+{items.length - 6} més…</div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-gray-300">—</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
