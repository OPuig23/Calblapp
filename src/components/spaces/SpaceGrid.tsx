// src/components/spaces/SpaceGrid.tsx
'use client'
import { format, addDays, startOfWeek } from 'date-fns'
import { ca } from 'date-fns/locale'
import SpaceCell from './SpaceCell'
import type { SpaceRow } from '@/services/spaces/spaces'
import CalendarModal from '@/components/calendar/CalendarModal'
import type { Deal } from '@/hooks/useCalendarData'


// 🔄 Adaptador: converteix un event del mòdul Espais al format CalendarModal
function adaptEventForCalendar(ev: any) {
  return {
    id: ev.id || `${ev.Ubicacio || ''}-${ev.DataInici || ''}`,
    NomEvent: ev.eventName || ev.NomEvent || '',
    LN: ev.ln || ev.LN || '',
    StageGroup: ev.stage || ev.Stage || 'Confirmat',
    StageDot: ev.stage ? `bg-${ev.stage}-500` : 'bg-green-500',
    DataInici: ev.date || ev.DataInici || '',
    DataFi: ev.dateEnd || ev.DataFinal || ev.DataFi || ev.DataInici || '',
    Comercial: ev.commercial || ev.Comercial || '',
    NumPax: ev.numPax || ev.NumPax || 0,
    Ubicacio: ev.Ubicacio || '',
  }
}



interface SpaceGridProps {
  data: SpaceRow[]               // nou: coherent amb el servei
  totals?: number[]              // totalPaxPerDia
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

  let totalPaxVerd = 0
  let totalEventsVerd = 0

  data.forEach((row) => {
    const dies = row.dies || []
    const cell = dies[i]
    if (!cell || !cell.events) return

    const verds = cell.events.filter((e: any) => e.stage === 'verd')
    totalPaxVerd += verds.reduce((acc: number, e: any) => acc + (e.numPax || 0), 0)
    totalEventsVerd += verds.length
  })

  return (
    <th
      key={i}
      className="p-2 border text-gray-700"
    >
      <div className="flex flex-col items-center justify-center leading-tight">
        <span className="text-xs font-medium">{dia}</span>
        <span className="text-[11px] sm:text-xs mb-1">{dataDia}</span>

        {/* 🔹 Tot en una línia */}
        <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-green-700">
          <span className="flex items-center gap-1">
            <span className="text-[12px]">👤</span>
            <span>{totalPaxVerd}</span>
            <span className="opacity-60">pax</span>
          </span>

          <span className="opacity-40">·</span>

          <span className="flex items-center gap-1 text-green-600">
            <span className="text-[12px]">📅</span>
            <span>{totalEventsVerd}</span>
            <span className="opacity-60">events</span>
          </span>
        </div>
      </div>
    </th>
  )
})}


          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx} className="border-t align-top">
               <td className="p-2 text-left font-semibold sticky left-0 bg-white border-r-4 border-gray-100 shadow-sm z-10 align-middle">
  <div className="flex items-center h-full text-gray-700 font-medium tracking-tight">
    {row.finca}
  </div>
</td>
                {row.dies.map((cell, i) => (
  <td key={i} className="p-1">
    {cell?.events?.map((ev: any, idx: number) => (
<CalendarModal
  key={`${row.finca}-${i}-${idx}`}
  deal={adaptEventForCalendar(ev) as Deal} // ✅ forcem el tipus Deal
  readonly={true} // 👈 força mode consulta
  trigger={
    <div
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation() // evita el NewEventModal
      }}
    >
      <SpaceCell
        event={{
          eventName: ev.eventName || ev.NomEvent,
          commercial: ev.commercial || ev.Comercial,
          numPax: ev.numPax || ev.NumPax,
          stage: ev.stage || ev.Stage || 'verd',
        }}
      />
    </div>
  }
/>



    ))}
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
