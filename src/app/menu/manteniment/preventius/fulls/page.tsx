'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import * as XLSX from 'xlsx'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import SmartFilters, { type SmartFiltersChange } from '@/components/filters/SmartFilters'
import { RoleGuard } from '@/lib/withRoleGuard'
import ExportMenu from '@/components/export/ExportMenu'
import { normalizeRole } from '@/lib/roles'
type TicketStatus = 'nou' | 'assignat' | 'en_curs' | 'espera' | 'resolut' | 'validat'

type Ticket = {
  id: string
  ticketCode?: string | null
  incidentNumber?: string | null
  location?: string
  machine?: string
  description?: string
  priority?: 'urgent' | 'alta' | 'normal' | 'baixa'
  status: TicketStatus
  assignedToNames?: string[]
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  nou: 'Nou',
  assignat: 'Assignat',
  en_curs: 'En curs',
  espera: 'Espera',
  resolut: 'Resolut',
  validat: 'Validat',
}

export default function PreventiusFullsPage() {
  const { data: session } = useSession()
  const role = normalizeRole((session?.user as any)?.role || '')
  const canFilterByWorker = role === 'admin' || role === 'direccio' || role === 'cap'
  const [filters, setFiltersState] = useState<{ start: string; end: string; mode: 'day' }>(() => {
    const value = format(new Date(), 'yyyy-MM-dd')
    return { start: value, end: value, mode: 'day' }
  })
  const [workerFilter, setWorkerFilter] = useState<string>('all')
  const [plannedItems, setPlannedItems] = useState<
    Array<{
      id: string
      kind: 'preventiu'
      title: string
      date: string
      startTime: string
      endTime: string
      location?: string
      worker?: string
      templateId?: string | null
      lastRecordId?: string | null
      lastStatus?: string | null
      lastProgress?: number | null
    }>
  >([])
  const [ticketItems, setTicketItems] = useState<
    Array<{
      id: string
      kind: 'ticket'
      title: string
      code?: string
      status?: 'nou' | 'assignat' | 'en_curs' | 'espera' | 'resolut' | 'validat'
      ticketType?: 'maquinaria' | 'deco'
      date: string
      startTime: string
      endTime: string
      location?: string
      worker?: string
      templateId?: string
    }>
  >([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [statusDraft, setStatusDraft] = useState<{
    status?: TicketStatus
    startTime: string
    endTime: string
    note: string
  }>({ startTime: '', endTime: '', note: '' })

  const loadPlannedItems = async (start: string, end: string) => {
    try {
      const res = await fetch(
        `/api/maintenance/preventius/planned?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        setPlannedItems([])
        return
      }
      const json = await res.json()
      const list = Array.isArray(json?.items) ? json.items : []
      const mapped = list
        .map((item: any) => {
          if (!item?.date || !item?.startTime || !item?.endTime) return null
          return {
            id: String(item.id || ''),
            kind: 'preventiu' as const,
            title: String(item.title || ''),
            date: String(item.date || ''),
            startTime: String(item.startTime || ''),
            endTime: String(item.endTime || ''),
            location: String(item.location || ''),
            worker: Array.isArray(item.workerNames) ? item.workerNames.join(', ') : '',
            templateId: item.templateId || null,
            lastRecordId: item.lastRecordId || null,
            lastStatus: item.lastStatus || null,
            lastProgress: typeof item.lastProgress === 'number' ? item.lastProgress : null,
          }
        })
        .filter(Boolean)
      setPlannedItems(mapped as any)
    } catch {
      setPlannedItems([])
    }
  }

  useEffect(() => {
    loadPlannedItems(filters.start, filters.end)
    const onFocus = () => loadPlannedItems(filters.start, filters.end)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [filters.start, filters.end])

  useEffect(() => {
    const loadTickets = async (start: string, end: string) => {
      try {
        const params = new URLSearchParams()
        params.set('ticketType', 'maquinaria')
        if (start) params.set('start', start)
        if (end) params.set('end', end)
        const res = await fetch(`/api/maintenance/tickets?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        const list = Array.isArray(json?.tickets) ? json.tickets : []
        const mapped = list
          .filter((t: any) => t.plannedStart && t.plannedEnd)
          .map((t: any) => {
            const start = new Date(Number(t.plannedStart))
            const end = new Date(Number(t.plannedEnd))
            const code = t.ticketCode || t.incidentNumber || 'TIC'
            const title = t.description || t.machine || t.location || ''
            return {
              id: String(t.id || code),
              kind: 'ticket' as const,
              title,
              code,
              status: t.status || 'nou',
              ticketType: t.ticketType === 'deco' ? 'deco' : 'maquinaria',
              date: format(start, 'yyyy-MM-dd'),
              startTime: format(start, 'HH:mm'),
              endTime: format(end, 'HH:mm'),
              location: t.location || '',
              worker: Array.isArray(t.assignedToNames) ? t.assignedToNames.join(', ') : '',
            }
          })
        setTicketItems(mapped)
      } catch {
        setTicketItems([])
      }
    }
    loadTickets(filters.start, filters.end)
    const onFocus = () => loadTickets(filters.start, filters.end)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [filters.start, filters.end])

  const handleDateChange = (f: SmartFiltersChange) => {
    if (!f.start) return
    const value = format(new Date(f.start), 'yyyy-MM-dd')
    setFiltersState({ start: value, end: value, mode: 'day' })
  }

  const filteredByDate = useMemo(() => {
    const start = parseISO(filters.start)
    const end = parseISO(filters.end)
    return [...plannedItems, ...ticketItems].filter((item) => {
      const date = parseISO(item.date)
      return date >= start && date <= end
    })
  }, [filters.start, filters.end, plannedItems, ticketItems])

  const workerOptions = useMemo(() => {
    const values = new Set<string>()
    filteredByDate.forEach((item) => {
      const raw = (item.worker || '').trim()
      if (!raw) return
      raw
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean)
        .forEach((w) => values.add(w))
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [filteredByDate])

  const grouped = useMemo(() => {
    const workerNeedle = workerFilter.toLowerCase()
    const items = filteredByDate.filter((item) => {
      if (!canFilterByWorker || workerFilter === 'all') return true
      const workers = (item.worker || '')
        .split(',')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
      return workers.includes(workerNeedle)
    })

    const map = new Map<string, typeof items>()
    items.forEach((item) => {
      const list = map.get(item.date) || []
      list.push(item)
      map.set(item.date, list)
    })

    return Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
  }, [filteredByDate, workerFilter, canFilterByWorker])

  const statusClasses: Record<string, string> = {
    nou: 'bg-emerald-100 text-emerald-800',
    assignat: 'bg-blue-100 text-blue-800',
    en_curs: 'bg-amber-100 text-amber-800',
    espera: 'bg-slate-100 text-slate-700',
    resolut: 'bg-green-100 text-green-800',
    validat: 'bg-purple-100 text-purple-800',
    pendent: 'bg-slate-100 text-slate-700',
    fet: 'bg-green-100 text-green-800',
    no_fet: 'bg-red-100 text-red-700',
  }

  const exportBase = `manteniment-fulls-${filters.start || 'start'}-${filters.end || 'end'}`

  const exportRows = useMemo(
    () =>
      grouped.flatMap(([day, items]) =>
        items.map((item) => {
          const isTicket = item.kind === 'ticket'
          const status = isTicket
            ? (item as any).status || 'assignat'
            : (item as any).lastStatus || 'pendent'
          const progress =
            !isTicket && typeof (item as any).lastProgress === 'number'
              ? `${(item as any).lastProgress}%`
              : ''
          return {
            Data: format(parseISO(day), 'dd/MM/yyyy'),
            Tipus: isTicket ? 'Ticket' : 'Preventiu',
            Codi: isTicket ? (item as any).code || '' : '',
            Titol: item.title || '',
            HoraInici: item.startTime || '',
            HoraFi: item.endTime || '',
            Ubicacio: item.location || '',
            Operari: item.worker || '',
            Estat: status,
            Progres: progress,
          }
        })
      ),
    [grouped]
  )

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'FullsTreball')
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
      'Tipus',
      'Codi',
      'Titol',
      'HoraInici',
      'HoraFi',
      'Ubicacio',
      'Operari',
      'Estat',
      'Progres',
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
    <h1>Manteniment - Fulls de treball</h1>
    <div class="meta">Rang: ${escapeHtml(filters.start || '')} - ${escapeHtml(
      filters.end || ''
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
    { label: 'Excel (.xlsx)', onClick: handleExportExcel, disabled: exportRows.length === 0 },
    { label: 'PDF (vista)', onClick: handleExportPdfView, disabled: grouped.length === 0 },
    { label: 'PDF (taula)', onClick: handleExportPdfTable, disabled: exportRows.length === 0 },
  ]

  const openFitxa = (id: string, recordId?: string | null) => {
    const url = recordId
      ? `/menu/manteniment/preventius/fulls/${id}?recordId=${encodeURIComponent(recordId)}`
      : `/menu/manteniment/preventius/fulls/${id}`
    const win = window.open(url, '_blank', 'noopener')
    if (win) win.opener = null
  }

  const openTicket = async (
    id: string,
    code?: string,
    ticketType?: 'maquinaria' | 'deco'
  ) => {
    try {
      if (code) {
        const res = await fetch(
          `/api/maintenance/tickets?ticketType=${ticketType || 'maquinaria'}&code=${encodeURIComponent(code)}`,
          { cache: 'no-store' }
        )
        if (res.ok) {
          const json = await res.json()
          const list = Array.isArray(json?.tickets) ? json.tickets : []
          if (list[0]) {
            setSelectedTicket(list[0])
            return
          }
        }
      }
      const res = await fetch(
        `/api/maintenance/tickets?ticketType=${ticketType || 'maquinaria'}`,
        { cache: 'no-store' }
      )
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json?.tickets) ? json.tickets : []
      const match = list.find((t: Ticket) => String(t.id) === String(id))
      if (match) setSelectedTicket(match)
    } catch {
      return
    }
  }

  const allowedNext = (status: TicketStatus) => {
    if (status === 'assignat') return ['en_curs', 'espera'] as TicketStatus[]
    if (status === 'en_curs') return ['espera', 'resolut'] as TicketStatus[]
    if (status === 'espera') return ['en_curs'] as TicketStatus[]
    return [] as TicketStatus[]
  }

  const handleStatusChange = async (
    ticket: Ticket,
    status: TicketStatus,
    meta?: { startTime?: string; endTime?: string; note?: string }
  ) => {
    try {
      const res = await fetch(`/api/maintenance/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          statusStartTime: meta?.startTime ?? null,
          statusEndTime: meta?.endTime ?? null,
          statusNote: meta?.note ?? null,
        }),
      })
      if (!res.ok) throw new Error()
      setSelectedTicket(null)
    } catch {
      alert('No s’ha pogut actualitzar')
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #manteniment-fulls-print-root, #manteniment-fulls-print-root * { visibility: visible; }
            #manteniment-fulls-print-root { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
        <ModuleHeader actions={<ExportMenu items={exportItems} />} />

        <SmartFilters
          modeDefault="day"
          role="Treballador"
          showDepartment={false}
          showWorker={false}
          showLocation={false}
          showStatus={false}
          onChange={handleDateChange}
          initialStart={filters.start}
          initialEnd={filters.end}
        />
        {canFilterByWorker && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Treballador</label>
            <select
              className="h-9 rounded-xl border bg-white px-3 text-sm"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            >
              <option value="all">Tots</option>
              {workerOptions.map((w) => (
                <option key={w} value={w.toLowerCase()}>
                  {w}
                </option>
              ))}
            </select>
          </div>
        )}

        <div id="manteniment-fulls-print-root" className="rounded-2xl border bg-white overflow-hidden">
          <div className="divide-y">
            {grouped.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">No hi ha tasques.</div>
            )}
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
                  {format(parseISO(day), 'dd/MM/yyyy')}
                </div>
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {item.kind === 'ticket'
                            ? item.code
                              ? `${item.code} - ${item.title}`
                              : item.title
                            : item.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.startTime}–{item.endTime}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.location}
                          {item.worker ? ` · ${item.worker}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.kind === 'ticket' && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              statusClasses[(item as any).status || 'assignat']
                            }`}
                          >
                            {(item as any).status || 'assignat'}
                          </span>
                        )}
                        {item.kind === 'preventiu' && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              statusClasses[(item as any).lastStatus || 'pendent'] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {(item as any).lastStatus || 'pendent'}
                            {typeof (item as any).lastProgress === 'number'
                              ? ` · ${(item as any).lastProgress}%`
                              : ''}
                          </span>
                        )}
                        <button
                          type="button"
                          className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                          onClick={() =>
                            item.kind === 'ticket'
                              ? openTicket(
                                  item.id,
                                  (item as any).code,
                                  (item as any).ticketType
                                )
                              : openFitxa(item.id, (item as any).lastRecordId || null)
                          }
                        >
                          {item.kind === 'ticket' ? 'Obrir ticket' : 'Obrir fitxa'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-800">
                  {selectedTicket.ticketCode || selectedTicket.incidentNumber || 'Ticket'}
                </div>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedTicket(null)}
                >
                  ×
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {selectedTicket.location || ''} {selectedTicket.machine ? `· ${selectedTicket.machine}` : ''}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {allowedNext(selectedTicket.status).map((next) => (
                  <button
                    key={next}
                    type="button"
                    onClick={() =>
                      setStatusDraft((prev) => ({
                        ...prev,
                        status: next,
                      }))
                    }
                    className={`px-3 py-1 rounded-full border text-xs ${
                      statusDraft.status === next
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white'
                    }`}
                  >
                    {STATUS_LABELS[next]}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-xs text-gray-600">
                  {statusDraft.status === 'resolut' ? 'Hora fi' : 'Hora inici'}
                  <input
                    type="time"
                    className="mt-1 h-9 w-32 rounded-lg border px-2 text-xs"
                    value={
                      statusDraft.status === 'resolut'
                        ? statusDraft.endTime
                        : statusDraft.startTime
                    }
                    onChange={(e) =>
                      setStatusDraft((prev) => ({
                        ...prev,
                        startTime:
                          prev.status === 'resolut'
                            ? prev.startTime
                            : e.target.value,
                        endTime:
                          prev.status === 'resolut'
                            ? e.target.value
                            : prev.endTime,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="mt-3 block text-xs text-gray-600">
                Observacions
                <textarea
                  className="mt-1 w-full rounded-lg border px-2 py-1 text-xs"
                  rows={3}
                  value={statusDraft.note}
                  onChange={(e) =>
                    setStatusDraft((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </label>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs text-gray-600"
                  onClick={() => setSelectedTicket(null)}
                >
                  Cancel·lar
                </button>
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white"
                  onClick={() => {
                    if (!statusDraft.status) return
                    if (statusDraft.status === 'resolut') {
                      if (!statusDraft.endTime) {
                        alert('Omple hora fi.')
                        return
                      }
                    } else if (!statusDraft.startTime) {
                      alert('Omple hora inici.')
                      return
                    }
                    handleStatusChange(selectedTicket, statusDraft.status, {
                      startTime:
                        statusDraft.status === 'resolut'
                          ? undefined
                          : statusDraft.startTime,
                      endTime:
                        statusDraft.status === 'resolut'
                          ? statusDraft.endTime
                          : undefined,
                      note: statusDraft.note,
                    })
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
