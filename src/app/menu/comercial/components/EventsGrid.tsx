import React from 'react'
import { Loader2 } from 'lucide-react'
import type { EventItem } from '../types'

interface Props {
  loading: boolean
  error: string | null
  events: EventItem[]
  pagedEvents: EventItem[]
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  commercialFilter: string
}

export default function EventsGrid({
  loading,
  error,
  events,
  pagedEvents,
  page,
  totalPages,
  onPageChange,
  onSelect,
  commercialFilter,
}: Props) {
  if (loading) {
    return (
      <section className="cmd-panel rounded-2xl border flex flex-col min-h-[60vh]">
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="cmd-panel rounded-2xl border flex flex-col min-h-[60vh]">
        <p className="text-sm text-red-500 px-4 py-3">{error}</p>
      </section>
    )
  }

  if (!events.length) {
    return (
      <section className="cmd-panel rounded-2xl border flex flex-col min-h-[60vh]">
        <p className="text-sm text-gray-500 px-4 py-3">
          No hi ha esdeveniments amb aquests filtres.
        </p>
      </section>
    )
  }

  return (
    <section className="cmd-panel rounded-2xl border flex flex-col min-h-[60vh]">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">Esdeveniments</h2>
        <p className="text-xs text-gray-500">
          {commercialFilter === '__all__' ? 'Tots els comercials' : commercialFilter}
        </p>
      </div>
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {pagedEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelect(ev.id)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm hover:border-[#cfe3f4] hover:bg-[#f6f8fd] transition"
            >
              <div className="text-sm font-semibold text-slate-800">
                {ev.name || ev.summary || 'Sense nom'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {ev.start} · {ev.horaInici || '-'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{ev.location || '-'}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Comercial: {ev.commercial || '-'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Pax: {ev.pax || 0}</div>
            </button>
          ))}
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t px-4 py-3">
          <button
            className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="Anterior"
          >
            ‹
          </button>
          <span className="text-xs text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Següent"
          >
            ›
          </button>
        </div>
      )}
    </section>
  )
}
