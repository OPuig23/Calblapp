//filename: src/components/calendar/CalendarWeekView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'

export default function CalendarWeekView({
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
      weekDays.forEach((d) => {
        const iso = format(d, 'yyyy-MM-dd')
        if (!(e < iso || s > iso)) byDay[iso]?.push(ev)
      })
    })

    // 🔄 Ordenem per StageGroup (verd > taronja > blau)
    Object.keys(byDay).forEach((key) => {
      byDay[key] = byDay[key].sort((a, b) => {
        const order = { verd: 1, taronja: 2, blau: 3 }
        const normalize = (stage?: string) => {
          const s = stage?.toLowerCase() || ''
          if (s.includes('confirmat') || s.includes('ganada')) return 'verd'
          if (s.includes('proposta') || s.includes('pendent')) return 'taronja'
          return 'blau'
        }
        return order[normalize(a.StageGroup)] - order[normalize(b.StageGroup)]
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
          <div key={iso} className="bg-white min-h-[180px] sm:min-h-[240px] p-2">
            <div className="text-xs sm:text-sm font-medium text-blue-600 mb-1">
              {format(d, 'EEE d', { locale: es })}
            </div>

            {items.length ? (
              <div className="flex flex-col gap-1">
                {items.slice(0, 12).map((ev) => {
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
                      key={`${iso}-${ev.id}`}
                      deal={ev}
                      trigger={
                        <div
                          onClick={(e) => e.stopPropagation()}
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

                {/* 👇 Si hi ha més de 12, mostra “+X més” amb submodal */}
                {items.length > 12 && (
                  <MoreEventsPopup date={d} events={items.slice(12)} />
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

// 📅 Submodal per veure la resta d’esdeveniments
function MoreEventsPopup({ date, events }: { date: Date; events: any[] }) {
  const [open, setOpen] = useState(false)
  const dayLabel = format(date, 'EEEE d MMMM', { locale: es })

  // 🔄 Ordenem també aquí per StageGroup
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
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="text-[10px] text-gray-400 italic cursor-pointer hover:text-blue-500"
      >
        +{events.length} més
      </div>

      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()} // ❌ Evita obrir modal nou
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold capitalize">
            Esdeveniments del {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div
          className="space-y-1 mt-2 max-h-[300px] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // ❌ Bloqueja modal nou
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
                    onClick={(e) => e.stopPropagation()}
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
