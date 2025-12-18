// file: src/components/calendar/CalendarWeekView.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CalendarModal from './CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'

/* =======================================================
   🔵 PUNT COMBINAT (OPCIÓ B)
   1) StageGroup (confirmat/taronja/taronja)
   2) Si no n'hi ha → color per col·lecció
   ======================================================= */
function dotColor(ev: Deal): string {
  const s = (ev.StageGroup || '').toLowerCase()

  if (s.includes('confirmat') || s.includes('ganada')) return 'bg-green-500'   // verd
  if (s.includes('proposta') || s.includes('pendent')) return 'bg-amber-500'  // taronja
  if (s.includes('prereserva') || s.includes('calent')) return 'bg-blue-500'  // taronja

  // Si StageGroup no existeix → mirem la col·lecció
  const c = (ev.collection || '').toLowerCase()
  if (c.includes('verd')) return 'bg-green-500'
  if (c.includes('taronja')) return 'bg-amber-500'
  if (c.includes('taronja')) return 'bg-blue-500'

  return 'bg-gray-300'
}

/* =======================================================
   COMPONENT
   ======================================================= */
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

  /* ───────────────────────────────────────────────
     1) GENERACIÓ DELS DIES DE LA SETMANA
  ─────────────────────────────────────────────── */
  const weekDays = useMemo(() => {
    const base = start ? parseISO(start) : new Date()
    return Array.from({ length: 7 }, (_, i) => addDays(base, i))
  }, [start])

  /* ───────────────────────────────────────────────
     2) AGRUPACIÓ D’ESDEVENIMENTS PER DIA
  ─────────────────────────────────────────────── */
  const groups = useMemo(() => {
    const byDay: Record<string, Deal[]> = {}

    weekDays.forEach((d) => (byDay[format(d, 'yyyy-MM-dd')] = []))

    deals.forEach((ev) => {
      const s = (ev.DataInici || ev.Data)?.slice(0, 10)
      const e = (ev.DataFi || ev.DataInici || ev.Data)?.slice(0, 10)
      if (!s || !e) return

      weekDays.forEach((d) => {
        const iso = format(d, 'yyyy-MM-dd')
        if (!(e < iso || s > iso)) {
          byDay[iso]?.push(ev)
        }
      })
    })

    // 🔄 Ordenació per etapa
    const order = { verd: 1, taronja: 2, taronja: 3 }
    const normalize = (stage?: string) => {
      const s = stage?.toLowerCase() || ''
      if (s.includes('confirmat') || s.includes('ganada')) return 'verd'
      if (s.includes('proposta') || s.includes('pendent')) return 'taronja'
      return 'taronja'
    }

    Object.keys(byDay).forEach((k) => {
      byDay[k] = byDay[k].sort(
        (a, b) => order[normalize(a.StageGroup)] - order[normalize(b.StageGroup)]
      )
    })

    return byDay
  }, [deals, weekDays])

  /* ───────────────────────────────────────────────
     3) RENDER
  ─────────────────────────────────────────────── */
  return (
    <div
      className="
        grid grid-cols-7 
        gap-[1px]
        bg-gray-300/60 
        rounded-lg 
        overflow-hidden
        w-full
        h-[calc(100dvh-180px)]
        sm:h-auto
      "
    >
      {weekDays.map((d) => {
        const iso = format(d, 'yyyy-MM-dd')
        const items = groups[iso] || []

        return (
          <div
            key={iso}
            className="
              bg-white 
              p-1.5 sm:p-2 
              flex flex-col 
              min-h-[13dvh] 
              sm:min-h-[180px]
            "
          >
            {/* DIA */}
            <div className="text-[10px] sm:text-sm font-medium text-blue-700 mb-1">
              {format(d, 'EEE d', { locale: es })}
            </div>

            {/* LLISTA */}
            {items.length ? (
              <div className="flex flex-col gap-[4px]">
                {items.slice(0, 8).map((ev, i) => {

                  const lnColor: Record<string, string> = {
                    Empresa: 'bg-blue-100 text-blue-700 border-blue-300',
                    Casaments: 'bg-green-100 text-green-700 border-green-300',
                    'Grups Restaurants': 'bg-yellow-100 text-yellow-700 border-yellow-300',
                    Foodlovers: 'bg-red-100 text-red-700 border-red-300',
                    Agenda: 'bg-gray-100 text-gray-800 border-gray-300',
                  }

                  const colorClass =
                    lnColor[ev.LN?.trim() || ''] ||
                    'bg-gray-100 text-gray-700 border-gray-300'

                  return (
                    <CalendarModal
                      key={`${iso}-${ev.id}-${i}`}

                      deal={ev}
                      onSaved={onCreated}
                      trigger={
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`
                            truncate px-1 py-[2px]
                            rounded-md border 
                            flex items-center gap-1
                            text-[10px] sm:text-[12px] font-medium
                            ${colorClass}
                          `}
                        >
                          {/* ÚNIC PUNT COMBINAT */}
                          <span className={`inline-block w-2 h-2 rounded-full ${dotColor(ev)}`} />

                          <span className="truncate">{ev.NomEvent}</span>
                        </div>
                      }
                    />
                  )
                })}

                {items.length > 8 && (
                  <MoreEventsPopup date={d} events={items.slice(8)} />
                )}
              </div>
            ) : (
              <div className="text-[10px] text-gray-300 mt-4 text-center">—</div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* =======================================================
   POPUP +X MÉS
   ======================================================= */
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
                  {/* Punt únic combinat */}
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
