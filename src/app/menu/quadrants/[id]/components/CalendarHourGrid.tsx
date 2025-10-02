// file: src/app/menu/quadrants/[id]/components/CalendarHourGrid.tsx
'use client'

import { QuadrantEvent } from '@/app/menu/quadrants/[id]/hooks/useQuadrants'
import { format } from 'date-fns'

interface CalendarHourGridProps {
  events: QuadrantEvent[]
  onEventClick: (event: QuadrantEvent) => void
}

const dayKeys = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

export default function CalendarHourGrid({ events, onEventClick }: CalendarHourGridProps) {
  // Set up hores (ex: 7 a 23h)
  const hours = Array.from({ length: 17 }, (_, i) => i + 7) // 7h to 23h

  // Mapeja events per dia
  const eventsByDay: Record<string, QuadrantEvent[]> = {}
  dayKeys.forEach((key) => (eventsByDay[key] = []))
  events.forEach((ev) => {
    const idx = (new Date(ev.start).getDay() + 6) % 7
    eventsByDay[dayKeys[idx]].push(ev)
  })

  // Utils de color
  const colorMap = {
    pending: 'bg-amber-400/90 border-amber-600',
    draft: 'bg-blue-400/90 border-blue-600',
    done: 'bg-green-500/90 border-green-700',
  }

  return (
    <div className="overflow-x-auto pb-4">
      {/* Capçalera */}
      <div className="grid grid-cols-8 gap-0">
        <div></div>
        {dayKeys.map((key) => (
          <div key={key} className="text-center py-2 font-bold">
            {key}
          </div>
        ))}
      </div>
      {/* Cos de la graella */}
      <div className="grid grid-cols-8 border-t border-gray-200">
        {/* Columna hores */}
        <div className="flex flex-col border-r border-gray-200">
          {hours.map((h) => (
            <div
              key={h}
              className="h-10 text-right pr-2 text-xs text-gray-500 leading-10"
            >
              {`${h.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>
        {/* Columnes dies */}
        {dayKeys.map((key) => (
          <div
            key={key}
            className="flex flex-col relative border-r border-gray-100 min-w-[120px]"
          >
            {/* Esdeveniments del dia */}
            {eventsByDay[key].map((ev) => {
              console.log('[CalendarView → EventTile]', {
                id: ev.id,
                code: ev.eventCode,
                state: ev.state,
                responsable: (ev as QuadrantEvent & { responsable?: string }).responsable,
                conductors: (ev as QuadrantEvent & { conductors?: string[] }).conductors,
                treballadors: (ev as QuadrantEvent & { treballadors?: string[] }).treballadors,
              })

              const start = new Date(ev.start)
              const end = new Date(ev.end)
              const hourStart = start.getHours() + start.getMinutes() / 60
              const hourEnd = end.getHours() + end.getMinutes() / 60
              const top = (hourStart - 7) * 40 // cada hora 40px
              const height = Math.max((hourEnd - hourStart) * 40, 28)
              const color =
                colorMap[ev.status as keyof typeof colorMap] ||
                'bg-gray-300 border-gray-400'

              return (
                <div
                  key={ev.id}
                  className={`absolute left-2 right-2 ${color} rounded shadow-md border cursor-pointer flex flex-col px-2 py-0.5`}
                  style={{ top, height }}
                  onClick={() => onEventClick(ev)}
                  title={ev.summary}
                >
                  <span className="text-xs font-bold">{ev.summary}</span>
                  <span className="text-[10px] opacity-80">
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                  </span>
                </div>
              )
            })}
            {/* Divisió d’hores per visual calendar */}
            {hours.map((_, hi) => (
              <div
                key={hi}
                className="border-t border-gray-100 absolute left-0 right-0"
                style={{ top: hi * 40, height: 0 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
