//file: src/components/spaces/SpaceGrid.tsx
'use client'
import { format, addDays, startOfWeek } from 'date-fns'
import { ca } from 'date-fns/locale'
import SpaceCell from './SpaceCell'

interface SpaceGridProps {
  data: {
    finca: string
    dies: {
      eventName?: string
      commercial?: string
      numPax?: number
      stage?: 'verd' | 'blau' | 'taronja' | 'lila'
    }[]
  }[]
  totals?: number[]
  baseDate?: string
}

export default function SpaceGrid({ data, totals = [], baseDate }: SpaceGridProps) {
  const start = startOfWeek(baseDate ? new Date(baseDate) : new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="overflow-x-auto snap-x scroll-smooth mt-4 w-full">
      <table className="min-w-max text-[10px] sm:text-xs border-collapse text-center w-full">
        <thead>
          <tr className="sticky top-0 bg-gray-100 z-20">
            <th className="p-2 text-left bg-white sticky left-0 shadow-sm z-30">Finca</th>
            {days.map((day, i) => {
              const dia = format(day, 'EEE', { locale: ca })
              const dataDia = format(day, 'dd/MM', { locale: ca })
              const total = totals[i] || 0
              const highlight = total >= 1000 ? 'bg-red-100 text-red-700 font-bold' : 'text-gray-700'
              return (
                <th key={i} className={`p-2 border ${highlight}`}>
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="text-xs font-medium">{dia}</span>
                    <span className="text-[11px] sm:text-xs mt-1">{dataDia}</span>
                    <span className="text-blue-700 font-semibold mt-1">👤 {total}</span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                <td className="p-2 text-left font-semibold sticky left-0 bg-white shadow-sm z-10">
                  {row.finca}
                </td>
                {row.dies.map((cell, i) => (
                  <td key={i} className="p-1">
                    <SpaceCell
                      eventName={cell?.eventName}
                      commercial={cell?.commercial}
                      numPax={cell?.numPax}
                      stageColor={cell?.stage || null}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="text-center text-gray-400 py-6">
                No hi ha dades disponibles per aquesta setmana.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
