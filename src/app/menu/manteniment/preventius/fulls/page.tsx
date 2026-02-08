'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import ModuleHeader from '@/components/layout/ModuleHeader'
import SmartFilters, { type SmartFiltersChange } from '@/components/filters/SmartFilters'
import { RoleGuard } from '@/lib/withRoleGuard'
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
  const [filters, setFiltersState] = useState<{ start: string; end: string; mode: 'day' }>(() => {
    const value = '2026-02-02'
    return { start: value, end: value, mode: 'day' }
  })
  const [plannedItems, setPlannedItems] = useState<
    Array<{
      id: string
      kind: 'preventiu' | 'ticket'
      title: string
      date: string
      startTime: string
      endTime: string
      location?: string
      worker?: string
      templateId?: string
      code?: string
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
  const [completed, setCompleted] = useState<
    Array<{ id?: string; plannedId?: string | null; status?: string; completedAt?: string }>
  >([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [statusDraft, setStatusDraft] = useState<{
    status?: TicketStatus
    startTime: string
    endTime: string
    note: string
  }>({ startTime: '', endTime: '', note: '' })

  const loadPlannedItems = () => {
    try {
      const raw = localStorage.getItem('maintenance.planificador.items')
      let list = raw ? JSON.parse(raw) : []
      if (!Array.isArray(list)) list = []
      const hasDemo = list.some(
        (i: any) =>
          i?.kind === 'preventiu' &&
          i?.title === 'Preventiu fuites de gas' &&
          i?.date === '2026-02-02'
      )
      if (!hasDemo) {
        const demo = {
          id: 'plan_demo_fuites_2026_02_02',
          kind: 'preventiu',
          title: 'Preventiu fuites de gas',
          date: '2026-02-02',
          start: '09:00',
          end: '11:00',
          location: 'Central alta temperatura',
          workers: ['Javi'],
          sourceId: 'fuites-gas-central',
        }
        list = [...list, demo]
        localStorage.setItem('maintenance.planificador.items', JSON.stringify(list))
      }
      const mapped = list
        .map((item: any) => {
          if (!item?.date || !item?.start || !item?.end) return null
          const title = String(item.title || '')
          const codeMatch = title.match(/^([A-Z]+\\d+)/)
          const templateId = title.toLowerCase().includes('fuites de gas')
            ? 'template-fuites-gas'
            : undefined
          const isTicket = item.kind === 'ticket'
          const resolvedId =
            isTicket && item.sourceId ? String(item.sourceId) : String(item.id || '')
          return {
            id:
              resolvedId ||
              String(item.id || `plan_${Math.random().toString(36).slice(2, 6)}`),
            kind: isTicket ? 'ticket' : 'preventiu',
            title,
            code: codeMatch ? codeMatch[1] : undefined,
            date: item.date,
            startTime: item.start,
            endTime: item.end,
            location: item.location || '',
            worker: Array.isArray(item.workers) ? item.workers.join(', ') : '',
            templateId,
          }
        })
        .filter(Boolean)
      setPlannedItems(mapped as any)
    } catch {
      setPlannedItems([])
    }
  }

  useEffect(() => {
    loadPlannedItems()
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'maintenance.planificador.items') loadPlannedItems()
    }
    const onFocus = () => loadPlannedItems()
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const loadCompleted = () => {
    fetch('/api/maintenance/preventius/completed', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const list = Array.isArray(json?.records) ? json.records : []
        setCompleted(list)
      })
      .catch(() => setCompleted([]))
  }

  useEffect(() => {
    loadCompleted()
    const onFocus = () => loadCompleted()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const res = await fetch('/api/maintenance/tickets?ticketType=maquinaria', {
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
            const templateId = String(title || '')
              .toLowerCase()
              .includes('fuites de gas')
              ? 'template-fuites-gas'
              : undefined
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
              templateId,
            }
          })
        setTicketItems(mapped)
      } catch {
        setTicketItems([])
      }
    }
    loadTickets()
  }, [])

  const handleDateChange = (f: SmartFiltersChange) => {
    if (!f.start) return
    const value = format(new Date(f.start), 'yyyy-MM-dd')
    setFiltersState({ start: value, end: value, mode: 'day' })
  }

  const grouped = useMemo(() => {
    const start = parseISO(filters.start)
    const end = parseISO(filters.end)
    const items = [...plannedItems, ...ticketItems].filter((item) => {
      const date = parseISO(item.date)
      return date >= start && date <= end
    })

    const map = new Map<string, typeof items>()
    items.forEach((item) => {
      const list = map.get(item.date) || []
      list.push(item)
      map.set(item.date, list)
    })

    return Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
  }, [filters.start, filters.end])

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

  const lastCompletedByPlan = useMemo(() => {
    const map = new Map<string, { id?: string; status?: string; completedAt?: string }>()
    completed.forEach((c) => {
      if (!c.plannedId) return
      const prev = map.get(c.plannedId)
      if (!prev) {
        map.set(c.plannedId, c)
        return
      }
      if ((c.completedAt || '') > (prev.completedAt || '')) {
        map.set(c.plannedId, c)
      }
    })
    return map
  }, [completed])

  const openFitxa = (id: string) => {
    const recordId = lastCompletedByPlan.get(id)?.id
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
        <ModuleHeader />

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

        <div className="rounded-2xl border bg-white overflow-hidden">
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
                          {item.company ? ` · ${item.company}` : ''}
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
                              statusClasses[lastCompletedByPlan.get(item.id)?.status || 'pendent'] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {lastCompletedByPlan.get(item.id)?.status || 'pendent'}
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
                              : openFitxa(item.id)
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
