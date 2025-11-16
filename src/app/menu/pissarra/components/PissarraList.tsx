// filename: src/app/menu/pissarra/components/PissarraList.tsx
'use client'

import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { ca } from 'date-fns/locale'
import { motion } from 'framer-motion'
import PissarraCard from './PissarraCard'
import type { PissarraItem } from '@/hooks/usePissarra'

interface Props {
  dataByDay: Record<string, PissarraItem[]>
  canEdit: boolean
  onUpdate: (id: string, payload: Partial<PissarraItem>) => Promise<void>
  weekStart: Date
}

export default function PissarraList({ dataByDay, canEdit, onUpdate, weekStart }: Props) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 })
  const end = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  return (
    <div
      key={weekStart.toISOString()}
      className="relative w-full overflow-x-auto"
    >

      {/* Header */}
      <div className="grid grid-cols-7 min-w-[950px] bg-white sticky top-0 z-20 border-b">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="text-center font-semibold text-gray-700 py-2 border-r last:border-r-0 text-sm uppercase bg-white"
          >
            <div>{format(day, 'd/MM', { locale: ca })}</div>
            <div className="text-[11px] text-gray-500">{format(day, 'EEE', { locale: ca })}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-7 min-w-[950px] max-h-[80vh] overflow-y-auto">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          let events = dataByDay[key] || []

          // 🔢 Ordenació per hora d’inici (hh:mm)
     events = [...events].sort((a, b) => {
  const hA = (a.startTime || '').trim()
  const hB = (b.startTime || '').trim()

  // Si falten hores, posa-les al final
  if (!hA && !hB) return 0
  if (!hA) return 1
  if (!hB) return -1

  return hA.localeCompare(hB)
})


          return (
            <div
              key={key}
              className="flex flex-col border-r last:border-r-0 border-gray-200 p-1 bg-gray-50"
            >
              {events.length > 0 ? (
                events.map((ev) => (
                  <motion.div key={ev.id} layout>
                    <PissarraCard item={ev} canEdit={canEdit} onUpdate={onUpdate} />
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-xs py-6">—</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
