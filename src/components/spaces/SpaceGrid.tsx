// ✅ file: src/components/spaces/SpaceGrid.tsx
'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ca } from 'date-fns/locale'
import SpaceCell from './SpaceCell'
import type { SpaceRow } from '@/services/spaces/spaces'
import SpaceEventModal from '@/components/spaces/SpaceEventModal'

/** Converteix un event d’Espais al format intern */
function adaptEvent(ev: any) {
  return {
    id: ev.id ?? `${ev.Ubicacio ?? ev.finca ?? ''}-${ev.date ?? ''}`,
    NomEvent: ev.NomEvent ?? ev.eventName ?? '',
    LN: ev.LN ?? ev.ln ?? '',
    StageGroup: ev.StageGroup ?? ev.stage ?? 'verd',
    DataInici: ev.DataInici ?? ev.date ?? '',
    DataFi: ev.DataFi ?? ev.dateEnd ?? ev.DataFinal ?? ev.DataInici ?? '',
    Comercial: ev.Comercial ?? ev.commercial ?? '',
    NumPax: ev.NumPax ?? ev.numPax ?? 0,
    Ubicacio: ev.Ubicacio ?? ev.finca ?? '',
    Servei: ev.Servei ?? ev.service ?? '',
    Code: ev.code ?? ev.Code ?? ev.id ?? '',
    HoraInici: ev.HoraInici ?? ev.startTime ?? '',
  }
}

interface SpaceGridProps {
  data: SpaceRow[]
  totals?: number[]
  baseDate?: string
}

/**
 * 🔹 SpaceGrid
 * Taula setmanal d'espais amb capçaleres totals i targetes clicables.
 * Ara integra SpaceEventModal (només lectura, mobile-first).
 */
export default function SpaceGrid({ data, totals = [], baseDate }: SpaceGridProps) {
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const start = startOfWeek(baseDate ? new Date(baseDate) : new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  // Logs de diagnòstic (només dev)
  if (process.env.NODE_ENV === 'development') {
    try {
      const totalEvents = data.reduce(
        (acc, row) => acc + (row?.dies ?? []).reduce((a, d) => a + (d?.events?.length ?? 0), 0),
        0
      )
      console.info('🧩 [SpaceGrid] Files:', data.length, '| Events totals:', totalEvents)
    } catch {/* ignore */}
  }

  return (
    <div className="overflow-x-auto snap-x scroll-smooth mt-4 w-full">
      <table className="min-w-[1200px] text-[10px] sm:text-xs border-collapse text-center w-full">

        <thead>
          <tr className="sticky top-0 bg-gray-100 z-20">
            <th className="p-2 text-left bg-white sticky left-0 shadow-sm z-30">Finca</th>

            {days.map((day, i) => {
              const dia = format(day, 'EEE', { locale: ca })
              const dataDia = format(day, 'dd/MM', { locale: ca })
              let totalPaxVerd = 0
              let totalEventsVerd = 0

              for (const row of data) {
                const dies = row?.dies ?? []
                const cell = dies[i]
                if (!cell || !Array.isArray(cell.events)) continue

                const verds = cell.events.filter((e: any) => {
                  const s = (e?.stage ?? e?.StageGroup ?? '').toString().toLowerCase()
                  return s === 'verd' || s.includes('confirmat')
                })

                totalPaxVerd += verds.reduce((a: number, e: any) => a + Number(e?.numPax ?? 0), 0)
                totalEventsVerd += verds.length
              }

              return (
                <th
                  key={`head-${i}`}
                  className={`p-2 border text-gray-700 transition-colors ${
                    totalPaxVerd > 1000
                      ? 'bg-red-100 text-red-700 font-semibold'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="text-xs font-medium">{dia}</span>
                    <span className="text-[11px] sm:text-xs mb-1">{dataDia}</span>

                    <div
                      className={`flex items-center justify-center gap-2 text-[11px] font-medium ${
                        totalPaxVerd > 1000 ? 'text-red-700' : 'text-green-700'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[12px]">👤</span>
                        <span>{totalPaxVerd}</span>
                        <span className="opacity-60">pax</span>
                      </span>

                      <span className="opacity-40">·</span>

                      <span
                        className={`flex items-center gap-1 ${
                          totalPaxVerd > 1000 ? 'text-red-700' : 'text-green-600'
                        }`}
                      >
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
            data.map((row, rIdx) => (
              <tr key={`row-${rIdx}`} className="border-t align-top">
               <td className="p-2 text-left font-semibold sticky left-0 bg-white border-r-4 border-gray-100 shadow-sm z-10 align-middle">
  <button
    type="button"
    onClick={() => {
      if (!row.fincaId) return
      window.open(
        `/menu/spaces/info/${row.fincaId}`,
        '_blank',
        'noopener,noreferrer'
      )
    }}
    className="flex items-center h-full text-gray-700 font-medium tracking-tight hover:underline text-left"
    title="Obrir fitxa de la finca en una pestanya nova"
  >
    {row.finca}
  </button>
</td>


                {(row?.dies ?? []).map((cell, cIdx) => (
                  <td key={`cell-${rIdx}-${cIdx}`} className="p-1 space-y-1">
                    {(cell?.events ?? []).map((ev: any, eIdx: number) => {
                      const event = adaptEvent(ev)
                      return (
                        <div
                          key={`${row.finca}-${cIdx}-${eIdx}`}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedEvent(event)
                            setModalOpen(true)
                          }}
                        >
                          <SpaceCell
                            event={{
                              eventName: event.NomEvent,
                              commercial: event.Comercial,
                              numPax: event.NumPax,
                              stage: event.StageGroup,
                            }}
                          />
                        </div>
                      )
                    })}
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

      {/* Modal informatiu */}
      <SpaceEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={selectedEvent}
      />
    </div>
  )
}
