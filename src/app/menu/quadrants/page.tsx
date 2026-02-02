// file: src/app/menu/quadrants/page.tsx
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'
import * as XLSX from 'xlsx'
import { CalendarDays } from 'lucide-react'
import ExportMenu from '@/components/export/ExportMenu'

import useFetch from '@/hooks/useFetch'
import type { QuadrantEvent } from '@/types/QuadrantEvent'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar, { type FiltersState } from '@/components/layout/FiltersBar'
import { useQuadrants } from '@/app/menu/quadrants/hooks/useQuadrants'
import QuadrantModal from './[id]/components/QuadrantModal'
import QuadrantCard from './drafts/components/QuadrantCard'
import { useQuadrantsPageData } from './hooks/useQuadrantsPageData'
import type { UnifiedEvent } from './types'


export default function QuadrantsPage() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(), { weekStartsOn: 1 })

  const [filters, setFilters] = useState<FiltersState>(() => ({
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    mode: 'week',
    ln: '__all__',
    responsable: '__all__',
    location: '__all__',
    status: '__all__',
  }))

  const {
    data: events = [],
    loading,
    error,
  } = useFetch('/api/events/quadrants', filters.start, filters.end)

  const { data: session } = useSession()
  const department =
    (
      session?.user?.department ||
      (session as any)?.department ||
      (session as any)?.dept ||
      'serveis'
    )
      .toString()
      .toLowerCase()

  const { quadrants, reload } = useQuadrants(
    department,
    filters.start,
    filters.end
  )
  useEffect(() => {
    const handler = () => reload()

    window.addEventListener('quadrant:created', handler)
    window.addEventListener('quadrant:updated', handler)

    return () => {
      window.removeEventListener('quadrant:created', handler)
      window.removeEventListener('quadrant:updated', handler)
    }
  }, [reload])


  const [selected, setSelected] = useState<UnifiedEvent | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const {
    eventsWithStatus,
    counts,
    filteredEvents,
    grouped,
    phasesByEventId,
  } = useQuadrantsPageData({
    events,
    quadrants,
    filters,
  })

  
  const lnOptions = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.ln || ev.lnLabel) {
        set.add((ev.ln || ev.lnLabel).toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  const responsables = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.responsable) {
        set.add(ev.responsable.toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  const locations = useMemo(() => {
    const set = new Set<string>()
    events.forEach((ev: any) => {
      if (ev.location) {
        set.add(ev.location.toString().trim().toLowerCase())
      }
    })
    return Array.from(set).sort()
  }, [events])

  
  const LOGISTIC_PHASE_OPTIONS = [
    { key: 'entrega', label: 'Entrega' },
    { key: 'event', label: 'Event' },
    { key: 'recollida', label: 'Recollida' },
  ]

  const SERVICE_PHASE_OPTIONS = [
    { key: 'muntatge', label: 'Muntatge' },
    { key: 'event', label: 'Event' },
  ]

  const phaseOptions = useMemo(
    () => {
      if (department === 'serveis') {
        return SERVICE_PHASE_OPTIONS
      }
      return LOGISTIC_PHASE_OPTIONS
    },
    [department]
  )

  const exportBase = `quadrants-${String(department || 'dept').replace(
    /\\s+/g,
    '-'
  )}-${filters.start}-${filters.end}`

  const statusLabel = (status?: string) => {
    if (status === 'confirmed') return 'Confirmat'
    if (status === 'draft') return 'Esborrany'
    if (status === 'pending') return 'Pendent'
    return ''
  }

  const exportRows = useMemo(
    () =>
      filteredEvents.map((ev) => {
        const startDate = String(ev.start || '').slice(0, 10)
        const startTime = ev.displayStartTime || ''
        const endTime = ev.displayEndTime || ''
        const timeRange =
          startTime || endTime ? `${startTime} - ${endTime}`.trim() : ''
        const horariLabel = ev.horariLabel || timeRange

        const rowDate = ev.start ? ev.start.slice(0, 10) : ''
        const eventDateRaw = ev.eventDateRaw || ''
        const hasPhaseLabel = Boolean(ev.phaseLabel)
        const showEventDate =
          hasPhaseLabel &&
          eventDateRaw &&
          rowDate &&
          eventDateRaw !== rowDate
        const phaseLabel = ev.phaseLabel ? ev.phaseLabel.toUpperCase() : ''
        const phaseLabelWithDate =
          hasPhaseLabel && showEventDate && ev.eventDateLabel
            ? `${phaseLabel} (${ev.eventDateLabel})`
            : phaseLabel

        return {
          Data: startDate,
          Responsable: ev.responsable || '',
          Fase: phaseLabelWithDate,
          Esdeveniment: ev.summary || '',
          LN: ev.ln || '',
          PAX: ev.numPax ?? '',
          Ubicacio: ev.location || '',
          Servei: (ev as any).service || '',
          Treballadors: ev.workersSummary || '',
          Horari: horariLabel,
          Estat: statusLabel(ev.quadrantStatus),
        }
      }),
    [filteredEvents]
  )

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Quadrants')
    XLSX.writeFile(wb, `${exportBase}.xlsx`)
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const buildPdfTableHtml = () => {
    const cols = [
      'Data',
      'Responsable',
      'Fase',
      'Esdeveniment',
      'LN',
      'PAX',
      'Ubicacio',
      'Servei',
      'Treballadors',
      'Horari',
      'Estat',
    ]

    const header = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
    const body = exportRows
      .map((row) => {
        const cells = cols
          .map((key) => `<td>${escapeHtml(String((row as any)[key] ?? ''))}</td>`)
          .join('')
        return `<tr>${cells}</tr>`
      })
      .join('')

    return `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>${escapeHtml(exportBase)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 16px; margin-bottom: 8px; }
      .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
      tr:nth-child(even) td { background: #fafafa; }
    </style>
  </head>
  <body>
    <h1>Quadrants</h1>
    <div class=\"meta\">Rang: ${escapeHtml(filters.start)} - ${escapeHtml(
      filters.end
    )}</div>
    <table>
      <thead><tr>${header}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`
  }

  const handleExportPdfTable = () => {
    const html = buildPdfTableHtml()
    const win = window.open('', '_blank', 'width=1200,height=900')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 300)
  }

  const handleExportPdfView = () => {
    window.print()
  }

  const exportItems = [
    { label: 'Excel (.xlsx)', onClick: handleExportExcel },
    { label: 'PDF (vista)', onClick: handleExportPdfView },
    { label: 'PDF (taula)', onClick: handleExportPdfTable },
  ]

  
  return (
    <main className="space-y-6 px-4 pb-12">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quadrants-print-root, #quadrants-print-root * { visibility: visible; }
          #quadrants-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <ModuleHeader
        icon={<CalendarDays className="w-7 h-7 text-indigo-600" />}
        title="Quadrants"
        subtitle="Gestió setmanal per departament"
        actions={<ExportMenu items={exportItems} />}
      />
      <FiltersBar
        id="filters-bar"
        filters={filters}
        setFilters={(patch) =>
          setFilters((prev) => ({ ...prev, ...patch }))
        }
        lnOptions={lnOptions}
        responsables={responsables}
        locations={locations}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50 border rounded-2xl p-3 shadow-sm text-sm font-medium">
        <div className="flex gap-6 sm:gap-10">
          <span className="flex items-center gap-2 text-yellow-700">
            <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
            Pendents: {counts.pending}
          </span>
          <span className="flex items-center gap-2 text-blue-700">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
            Esborranys: {counts.draft}
          </span>
          <span className="flex items-center gap-2 text-green-700">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            Confirmats: {counts.confirmed}
          </span>
        </div>
      </div>

      {loading && (
        <p className="text-center text-gray-500 py-10">
          Carregant quadrants¦
        </p>
      )}

      {error && (
        <p className="text-center text-red-600 py-10">
          {String(error)}
        </p>
      )}

      {!loading && !error && grouped.length === 0 && (
        <p className="text-center text-gray-400 py-10">
          Cap esdeveniment trobat per aquest rang de dates.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div
          id="quadrants-print-root"
          className="overflow-x-auto rounded-xl border bg-white shadow-sm"
        >
          <table className="w-full text-sm">
            <thead className="bg-indigo-100 text-indigo-900 font-semibold">
              <tr>
                <th className="px-3 py-2 text-left">Responsable</th>
                <th className="px-3 py-2 text-left">Fase</th>
                <th className="px-3 py-2 text-left">Esdeveniment</th>
                <th className="px-3 py-2 text-left">LN</th>
                <th className="px-3 py-2 text-left">PAX</th>
                <th className="px-3 py-2 text-left">Finca / Ubicacio</th>
                <th className="px-3 py-2 text-left">Servei</th>
                <th className="px-3 py-2 text-left">Hora inici</th>
                <th className="px-3 py-2 text-left">Treballadors</th>
                <th className="px-3 py-2 text-left">Horari</th>
                <th className="px-3 py-2 text-center"></th>
              </tr>
            </thead>

            <tbody>
              {grouped.map(([day, evs]) => (
                <React.Fragment key={day}>
                  <tr className="bg-indigo-50 text-indigo-800">
                    <td colSpan={11} className="px-3 py-2 font-semibold">
                      {format(parseISO(day), 'dd-MM-yyyy')}
                    </td>
                  </tr>

                  {/* Files per esdeveniment */}
                  {evs.map((ev) => {
                    const draft = (ev as any).draft

                    const dotClass =
                      ev.quadrantStatus === 'confirmed'
                        ? 'bg-green-500'
                        : ev.quadrantStatus === 'draft'
                        ? 'bg-blue-500'
                        : 'bg-yellow-400'

                    const startTime = ev.displayStartTime || '--:--'
                    const endTime = ev.displayEndTime || '--:--'
                    const horariLabel = ev.horariLabel || `${startTime} - ${endTime}`
                    const rowDate = ev.start ? ev.start.slice(0, 10) : ''
                    const eventDateRaw = ev.eventDateRaw || ''
                    const hasPhaseLabel = Boolean(ev.phaseLabel)
                    const showEventDate =
                      hasPhaseLabel &&
                      eventDateRaw &&
                      rowDate &&
                      eventDateRaw !== rowDate
                    const phaseLabel = ev.phaseLabel ? ev.phaseLabel.toUpperCase() : ''
                    const phaseLabelWithDate =
                      hasPhaseLabel && showEventDate && ev.eventDateLabel
                        ? `${phaseLabel} (${ev.eventDateLabel})`
                        : phaseLabel
                    const eventId = String(ev.eventId || ev.eventCode || ev.code || ev.id || "")
                      .trim()
                    const existingPhases = eventId ? phasesByEventId[eventId] : undefined
                    const pendingPhases = eventId
                      ? phaseOptions
                          .filter((p) => !(existingPhases && existingPhases.has(p.key)))
                          .map((p) => ({
                            key: p.key,
                            label:
                              p.key !== 'event' && ev.eventDateLabel
                                ? `${p.label} (${ev.eventDateLabel})`
                                : p.label,
                          }))
                      : []

                    const fragmentKey = `${eventId || ev.id || ''}__${
                      ev.phaseKey || ev.phaseType || ev.phaseLabel || 'event'
                    }__${ev.phaseDate || ev.start || ''}`
                    return (
                      <React.Fragment key={fragmentKey}>
                        <tr
                          className="cursor-pointer hover:bg-indigo-50 transition"
                          onClick={() => {
                            if (ev.quadrantStatus === 'pending') {
                              setSelected({
                                ...ev,
                                startTime: ev.displayStartTime || ev.startTime,
                                endTime: ev.displayEndTime || ev.endTime,
                              })
                            } else if (draft && draft.id) {
                              setExpandedId((prev) =>
                                prev === draft.id ? null : draft.id
                              )
                            }
                          }}
                        >
                          <td className="px-3 py-2">
                            {ev.responsable || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {hasPhaseLabel ? (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                {phaseLabelWithDate}
                              </span>
                            ) : (
                              ''
                            )}
                          </td>
                          <td className="px-3 py-2">{ev.summary}</td>
                          <td className="px-3 py-2">{ev.ln || '-'}</td>
                          <td className="px-3 py-2">{ev.numPax ?? '-'}</td>
                          <td className="px-3 py-2">
                            {ev.location || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {ev.service || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {startTime}
                          </td>
                          <td className="px-3 py-2">
                            {ev.workersSummary || '-'}
                          </td>
                          <td className="px-3 py-2">
                            {horariLabel}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-3 h-3 rounded-full ${dotClass}`}
                            />
                          </td>
                        </tr>

                        {draft && draft.id && expandedId === draft.id && (
                          <tr>
                            <td colSpan={11} className="bg-white border-t px-3 py-3">
                              <div className="rounded-xl border bg-gray-50 p-4">
                               <QuadrantCard
                                 quadrant={draft}
                                 autoExpand
                                 pendingPhases={pendingPhases}
                                 onCreatePhase={(phaseKey) => {
                                   setSelected({
                                     ...ev,
                                     phaseKey,
                                     startTime: ev.displayStartTime || ev.startTime,
                                     endTime: ev.displayEndTime || ev.endTime,
                                   })
                                 }}
                               />

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <QuadrantModal
          open
          event={selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        />
      )}
    </main>
  )
}
