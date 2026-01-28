import React from 'react'
import { Trash2, Users } from 'lucide-react'
import ExportMenu from '@/components/export/ExportMenu'
import type { OrderState } from '../types'

interface Props {
  selectedEventName: string
  selectedEventDetails: string
  onBackToEvents: () => void
  currentOrder?: OrderState
  updatePax: (value: number) => void
  clearOrder: () => void
  exportItems: { label: string; onClick: () => void; disabled?: boolean }[]
}

export default function ComercialHeader({
  selectedEventName,
  selectedEventDetails,
  onBackToEvents,
  currentOrder,
  updatePax,
  clearOrder,
  exportItems,
}: Props) {
  return (
    <section className="cmd-panel rounded-2xl border px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBackToEvents}
          className="text-left rounded-lg px-2 py-1 transition hover:bg-slate-100"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Esdeveniments
          </div>
          <div className="text-sm font-semibold text-slate-800">{selectedEventName}</div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">
              {selectedEventDetails.split(' · ')[0]}
            </span>
            <span className="text-slate-400">
              {selectedEventDetails.includes(' · ')
                ? ` · ${selectedEventDetails.split(' · ').slice(1).join(' · ')}`
                : ''}
            </span>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-[11px] text-slate-500">
          <Users className="w-4 h-4" />
          <input
            type="number"
            min={0}
            className="h-7 w-24 sm:w-20 md:w-16 rounded-md border border-slate-200 bg-white px-2 text-xs md:text-[11px] text-center"
            value={currentOrder?.pax ?? 0}
            onChange={(e) => updatePax(Number(e.target.value))}
          />
          <button
            className="h-6 w-6 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-700"
            onClick={clearOrder}
            aria-label="Neteja comanda"
            title="Neteja comanda"
          >
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
          <ExportMenu items={exportItems} ariaLabel="Exportar" />
        </div>
      </div>
    </section>
  )
}
