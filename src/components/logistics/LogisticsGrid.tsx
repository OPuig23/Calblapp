// file: src/components/logistics/LogisticsGrid.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ca } from 'date-fns/locale'
import { RefreshCcw, CalendarClock } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSession } from 'next-auth/react'
import SmartFilters, { SmartFiltersChange } from '@/components/filters/SmartFilters'
import { useLogisticsData } from '@/hooks/useLogisticsData'
import { Button } from '@/components/ui/button'
import ExportMenu from '@/components/export/ExportMenu'

type EditedMap = Record<string, { PreparacioData?: string; PreparacioHora?: string }>

function parseDM(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(value?.trim() || '')
  if (!m) return null
  const d = Number(m[1])
  const mm = Number(m[2])
  if (d < 1 || d > 31 || mm < 1 || mm > 12) return null
  return { d, m: mm }
}

function toISOFromDM(dm: string, year: number) {
  const p = parseDM(dm)
  if (!p) return ''
  const dd = String(p.d).padStart(2, '0')
  const mm = String(p.m).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function fmtDM(dateIsoOrEmpty: string) {
  if (!dateIsoOrEmpty) return ''
  const d = new Date(dateIsoOrEmpty)
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd/MM', { locale: ca })
}

export default function LogisticsGrid() {
  const { data: session } = useSession()
  const role = (session?.user?.role || '').toLowerCase()
  const isWorker = role === 'treballador'
  const isManager = role === 'cap' || role === 'admin' || role === 'direccio'

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null)
  const { events, refresh, loading } = useLogisticsData(dateRange)
  const [updating, setUpdating] = useState(false)
  const [edited, setEdited] = useState<EditedMap>({})
  const [rows, setRows] = useState(events)

  useEffect(() => {
    if (events.length > 0) {
      const sorted = [...events].sort((a, b) => {
        const aHas = !!(a.PreparacioData && a.PreparacioHora)
        const bHas = !!(b.PreparacioData && b.PreparacioHora)
        if (aHas && !bHas) return -1
        if (!aHas && bHas) return 1
        if (!aHas && !bHas) {
          return new Date(a.DataInici).getTime() - new Date(b.DataInici).getTime()
        }
        const d1 = new Date(`${a.PreparacioData}T${a.PreparacioHora || '00:00'}`).getTime()
        const d2 = new Date(`${b.PreparacioData}T${b.PreparacioHora || '00:00'}`).getTime()
        return d1 - d2
      })
      setRows(sorted)
    } else {
      setRows([])
    }
  }, [events])

  const handleFilterChange = (f: SmartFiltersChange) => {
    if (f.start && f.end) setDateRange({ start: f.start, end: f.end })
  }

  const handleRefresh = async () => {
    setUpdating(true)
    await refresh()
    setUpdating(false)
  }

  const handleConfirm = async () => {
    setUpdating(true)

    const ids = Object.keys(edited)
    const errors: string[] = []

    for (const id of ids) {
      const original = rows.find((r) => r.id === id)
      const payload: { id: string; PreparacioData?: string; PreparacioHora?: string } = { id }

      if (edited[id]?.PreparacioData) {
        const year = original ? new Date(original.DataInici).getFullYear() : new Date().getFullYear()
        payload.PreparacioData = toISOFromDM(edited[id].PreparacioData!, year)
      }
      if (edited[id]?.PreparacioHora) {
        payload.PreparacioHora = edited[id].PreparacioHora!
      }

      const res = await fetch('/api/logistics/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        errors.push(id)
      }
    }

    await refresh()

    setEdited({})
    setUpdating(false)

    if (errors.length) {
      console.error('Errors guardant preparacions per IDs:', errors)
      alert("Algunes files no s'han pogut guardar. Revisa la consola.")
    }
  }

  const exportBase = dateRange?.start && dateRange?.end
    ? `preparacio-logistica-${dateRange.start}-${dateRange.end}`
    : 'preparacio-logistica-setmana'

  const exportRows = useMemo(() => {
    return rows.map((ev) => ({
      PreparacioData: ev.PreparacioData || '',
      PreparacioHora: ev.PreparacioHora || '',
      Event: ev.NomEvent || '',
      Ubicacio: ev.Ubicacio || '',
      Pax: ev.NumPax ?? '',
      DataEvent: ev.DataInici || '',
      HoraEvent: ev.HoraInici || '',
    }))
  }, [rows])

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Preparacio')
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
      'PreparacioData',
      'PreparacioHora',
      'Event',
      'Ubicacio',
      'Pax',
      'DataEvent',
      'HoraEvent',
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
    <meta charset="utf-8" />
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
    <h1>Preparacio logistica</h1>
    <div class="meta">Rang: ${escapeHtml(
      dateRange?.start || ''
    )} - ${escapeHtml(dateRange?.end || '')}</div>
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
    <div className="mt-4 w-full overflow-hidden rounded-xl border bg-white shadow-sm">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #preparacio-print-root, #preparacio-print-root * { visibility: visible; }
          #preparacio-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div className="border-b bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SmartFilters
            showStatus={false}
            modeDefault="week"
            onChange={handleFilterChange}
          />
          <ExportMenu items={exportItems} />
        </div>
      </div>

      <div id="preparacio-print-root">
        {isWorker ? (
          <WorkerGroupedView events={rows} loading={loading} />
        ) : (
          <EditableTable
            rows={rows}
            edited={edited}
            setEdited={setEdited}
            isManager={isManager}
            loading={loading}
          />
        )}
      </div>

      {isManager && (
        <div className="flex justify-between border-t bg-gray-50 p-4">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-600 transition hover:bg-gray-100"
          >
            <RefreshCcw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
            Actualitzar
          </button>
          <button
            onClick={handleConfirm}
            disabled={updating}
            className={`rounded-lg px-4 py-2 text-sm text-white transition-colors ${
              updating ? 'cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {updating ? 'Guardant...' : 'Confirmar ordre'}
          </button>
        </div>
      )}
    </div>
  )
}

function WorkerGroupedView({ events, loading }: { events: any[]; loading: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, any[]>()
    events.forEach(ev => {
      const key = ev.PreparacioData || ev.DataInici?.toString() || 'sense-data'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return Array.from(map.entries()).sort((a, b) => {
      const da = new Date(a[0]).getTime()
      const db = new Date(b[0]).getTime()
      return da - db
    })
  }, [events])

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">Carregant dades...</div>
  }

  if (!groups.length) {
    return <div className="p-4 text-center text-sm text-gray-400">No hi ha dades disponibles.</div>
  }

  return (
    <div className="divide-y">
      {groups.map(([dayIso, items]) => {
        const label = dayIso && dayIso !== 'sense-data'
          ? (() => {
              const d = parseISO(dayIso)
              const dowIdx = d.getDay()
              const dowMap = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds']
              const dow = dowMap[dowIdx] || format(d, 'EEE', { locale: ca })
              return `${dow} ${format(d, 'dd/LL/yy', { locale: ca })}`
            })()
          : 'Sense data de preparació'

        const ordered = [...items].sort((a, b) => {
          const ha = a.PreparacioHora || ''
          const hb = b.PreparacioHora || ''
          if (ha && hb) return ha.localeCompare(hb)
          if (ha) return -1
          if (hb) return 1
          return 0
        })

        return (
          <div key={dayIso} className="pb-4">
            <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-900">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                <span className="uppercase tracking-wide">{label}</span>
              </div>
              <div className="text-xs font-semibold text-pink-600">
                {ordered.length} prep
              </div>
            </div>

            {/* Targetes per mòbil */}
            <div className="mt-2 flex flex-col gap-3 md:hidden">
              {ordered.map(ev => (
                <div key={ev.id} className="rounded-xl border bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      {ev.PreparacioHora || '--:--'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ev.DataInici
                        ? format(new Date(ev.DataInici), 'dd/LL/yy', { locale: ca })
                        : '--/--/--'}
                    </div>
                  </div>

                  <div className="mt-1 text-sm font-semibold leading-snug text-slate-900">
                    {ev.NomEvent || 'Sense nom'}
                  </div>

                  <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {ev.Ubicacio || 'Sense ubicació'}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                    <span>Pax: {ev.NumPax ?? '--'}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Prep: {ev.PreparacioHora || '--:--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Taula per desktop */}
            <div className="mt-2 hidden overflow-x-auto md:block">
              <table className="w-full min-w-full overflow-hidden rounded-lg border border-slate-200 text-xs sm:min-w-[560px]">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="w-24 px-3 py-2 text-left">Hora prep.</th>
                    <th className="px-3 py-2 text-left">Nom esdeveniment</th>
                    <th className="w-16 px-3 py-2 text-left">Pax</th>
                    <th className="px-3 py-2 text-left">Ubicació</th>
                    <th className="w-28 px-3 py-2 text-left">Data event</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map(ev => (
                    <tr key={ev.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-700">{ev.PreparacioHora || '--:--'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{ev.NomEvent || 'Sense nom'}</td>
                      <td className="px-3 py-2 text-slate-700">{ev.NumPax ?? '--'}</td>
                      <td className="px-3 py-2 text-slate-700">{ev.Ubicacio || 'Sense ubicació'}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {ev.DataInici ? format(new Date(ev.DataInici), 'dd/MM', { locale: ca }) : '--/--/--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EditableTable({
  rows,
  edited,
  setEdited,
  isManager,
  loading,
}: {
  rows: any[]
  edited: EditedMap
  setEdited: React.Dispatch<React.SetStateAction<EditedMap>>
  isManager: boolean
  loading: boolean
}) {
  return (
    <div className="overflow-x-auto scroll-smooth">
      <table className="min-w-full w-full border-collapse text-[10px] sm:min-w-[560px] sm:text-xs">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="sticky left-0 z-30 bg-white p-2 shadow-sm">Data preparació</th>
            <th className="p-2">Hora preparació</th>
            <th className="p-2">Nom</th>
            <th className="p-2">Pax</th>
            <th className="p-2">Ubicació</th>
            <th className="p-2">Data esdeveniment</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                Carregant dades...
              </td>
            </tr>
          ) : rows.length > 0 ? (
            rows.map((ev, idx) => {
              const prepDM = edited[ev.id]?.PreparacioData ?? fmtDM(ev.PreparacioData || '')
              const prepH = edited[ev.id]?.PreparacioHora ?? (ev.PreparacioHora || '')

              return (
                <tr
                  key={`row-${idx}`}
                  className="border-t text-left align-top transition-colors hover:bg-gray-50"
                >
                  <td className="sticky left-0 border-r bg-white p-2 font-medium shadow-sm">
                    {isManager ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/MM"
                        pattern="\d{1,2}/\d{1,2}"
                        value={prepDM}
                        onChange={(e) => {
                          const v = e.target.value
                          setEdited((prev) => ({
                            ...prev,
                            [ev.id]: { ...prev[ev.id], PreparacioData: v },
                          }))
                        }}
                        className="w-full rounded border p-1 text-xs"
                      />
                    ) : (
                      <span>{prepDM || '-'}</span>
                    )}
                  </td>

                  <td className="p-2">
                    {isManager ? (
                      <input
                        type="time"
                        value={prepH}
                        onChange={(e) => {
                          const v = e.target.value
                          setEdited((prev) => ({
                            ...prev,
                            [ev.id]: { ...prev[ev.id], PreparacioHora: v },
                          }))
                        }}
                        className="w-full rounded border p-1 text-xs"
                      />
                    ) : (
                      <span>{prepH || '-'}</span>
                    )}
                  </td>

                  <td className="p-2">{ev.NomEvent}</td>
                  <td className="p-2">{ev.NumPax ?? '-'}</td>
                  <td className="p-2">{ev.Ubicacio}</td>
                  <td className="p-2">
                    {format(new Date(ev.DataInici), 'dd/MM', { locale: ca })}
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                No hi ha dades disponibles.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
