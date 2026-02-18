'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import { normalizeRole } from '@/lib/roles'
import SmartFilters, { type SmartFiltersChange } from '@/components/filters/SmartFilters'
import FilterButton from '@/components/ui/filter-button'
import { useFilters } from '@/context/FiltersContext'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

type TicketStatus = 'nou' | 'assignat' | 'en_curs' | 'espera' | 'resolut' | 'validat'
type TicketPriority = 'urgent' | 'alta' | 'normal' | 'baixa'

type Ticket = {
  id: string
  ticketCode?: string | null
  incidentNumber?: string | null
  location: string
  machine: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: number | string
  plannedStart?: number | string | null
  createdByName?: string
  assignedToIds?: string[]
  assignedToNames?: string[]
  statusHistory?: Array<{
    status: TicketStatus
    at?: number | string | null
    byName?: string | null
  }>
}

type PlannedItem = {
  id: string
  kind: 'preventiu' | 'ticket'
  title: string
  date?: string
  start?: string
  end?: string
  location?: string
  worker?: string
  templateId?: string
}

type CompletedRecord = {
  id: string
  plannedId?: string | null
  templateId?: string | null
  title: string
  worker?: string | null
  status?: string
  completedAt: string
  checklist?: Record<string, boolean>
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  nou: 'Nou',
  assignat: 'Assignat',
  en_curs: 'En curs',
  espera: 'Espera',
  resolut: 'Resolut',
  validat: 'Validat',
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  alta: 'Alta',
  normal: 'Normal',
  baixa: 'Baixa',
}

const formatMachine = (value?: string) => {
  if (!value) return ''
  const parts = value.split('·').map((p) => p.trim()).filter(Boolean)
  if (parts.length > 1) return parts.slice(1).join(' · ').trim()
  return value.replace(/^([A-Z]{1,3}\d{3,}|Z\d{6,})\s*[-–]\s*/i, '').trim()
}

const getTicketDate = (ticket: Ticket) => {
  const base = ticket.plannedStart || ticket.createdAt
  if (!base) return null
  const date = typeof base === 'string' ? new Date(base) : new Date(Number(base))
  if (Number.isNaN(date.getTime())) return null
  return date
}

const getChecklistProgress = (checklist?: Record<string, boolean>) => {
  const values = checklist ? Object.values(checklist) : []
  if (values.length === 0) return 0
  const done = values.filter(Boolean).length
  return Math.round((done / values.length) * 100)
}

export default function MaintenanceTrackingPage() {
  const { data: session } = useSession()
  const role = normalizeRole((session?.user as any)?.role || '')
  const dept = ((session?.user as any)?.department || '').toString().toLowerCase()

  const canView =
    role === 'admin' ||
    role === 'direccio' ||
    role === 'cap' ||
    role === 'comercial' ||
    (role === 'treballador' && dept === 'produccio')

  const [statusFilter, setStatusFilter] = useState<'__all__' | TicketStatus>(
    '__all__'
  )
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({})

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [historyTicket, setHistoryTicket] = useState<Ticket | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name?: string; department?: string }>>([])
  const [typeFilter, setTypeFilter] = useState<'__all__' | 'ticket' | 'preventiu'>('__all__')
  const [workerFilter, setWorkerFilter] = useState('__all__')
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([])
  const [completed, setCompleted] = useState<CompletedRecord[]>([])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== '__all__') {
        params.set('status', statusFilter)
      }
      params.set('ticketType', 'maquinaria')
      const res = await fetch(`/api/maintenance/tickets?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const list = Array.isArray(json?.tickets) ? json.tickets : []
      setTickets(list)
    } catch {
      setTickets([])
      setError('No s’han pogut carregar els tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) return
    fetchTickets()
  }, [statusFilter, canView])

  useEffect(() => {
    if (!canView) return
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        setUsers(Array.isArray(json) ? json : [])
      } catch {
        setUsers([])
      }
    }
    loadUsers()
  }, [canView])

  useEffect(() => {
    if (!canView) return
    const loadPlanned = async () => {
      try {
        const params = new URLSearchParams()
        if (dateRange.start) params.set('start', dateRange.start)
        if (dateRange.end) params.set('end', dateRange.end)
        const qs = params.toString()
        const res = await fetch(
          `/api/maintenance/preventius/planned${qs ? `?${qs}` : ''}`,
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
            if (!item?.id || !item?.title) return null
            return {
              id: String(item.id),
              kind: 'preventiu',
              title: String(item.title || ''),
              date: String(item.date || ''),
              start: String(item.startTime || ''),
              end: String(item.endTime || ''),
              location: String(item.location || ''),
              worker: Array.isArray(item.workerNames) ? item.workerNames.join(', ') : '',
              templateId: item.templateId || undefined,
            } as PlannedItem
          })
          .filter(Boolean)
        setPlannedItems(mapped as PlannedItem[])
      } catch {
        setPlannedItems([])
      }
    }
    loadPlanned()
  }, [canView, dateRange.start, dateRange.end])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/maintenance/preventius/completed', { cache: 'no-store' })
        if (!res.ok) {
          setCompleted([])
          return
        }
        const json = await res.json()
        const list = Array.isArray(json?.records) ? json.records : []
        setCompleted(list)
      } catch {
        setCompleted([])
      }
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase()
    const userById = new Map(users.map((u) => [String(u.id), u]))
    const list = tickets.filter((ticket) => {
      if (workerFilter !== '__all__') {
        const ids = Array.isArray(ticket.assignedToIds) ? ticket.assignedToIds : []
        if (!ids.map(String).includes(workerFilter)) return false
      }

      if (typeFilter === 'preventiu') return false

      if (!query) return true
      const code = (ticket.ticketCode || ticket.incidentNumber || '').toLowerCase()
      const machine = (ticket.machine || '').toLowerCase()
      return code.includes(query) || machine.includes(query)
    })

    const start = dateRange.start ? parseISO(dateRange.start) : null
    const end = dateRange.end ? parseISO(dateRange.end) : null
    const ranged = list.filter((t) => {
      if (!start && !end) return true
      const date = getTicketDate(t)
      if (!date) return false
      if (start && date < start) return false
      if (end && date > new Date(end.getTime() + 24 * 60 * 60 * 1000)) return false
      return true
    })

    ranged.sort((a, b) => {
      const order: Record<TicketStatus, number> = {
        validat: 0,
        resolut: 1,
        en_curs: 2,
        espera: 3,
        assignat: 4,
        nou: 5,
      }
      const aOrder = order[a.status] ?? 99
      const bOrder = order[b.status] ?? 99
      if (aOrder !== bOrder) return aOrder - bOrder
      const da = getTicketDate(a)?.getTime() ?? 0
      const db = getTicketDate(b)?.getTime() ?? 0
      return db - da
    })

    return ranged
  }, [tickets, search, workerFilter, users, dateRange, typeFilter])

  const preventiusRows = useMemo(() => {
    const byPlanned = new Map<string, CompletedRecord>()
    const byTemplate = new Map<string, CompletedRecord>()
    completed.forEach((c) => {
      if (c.plannedId) {
        const prev = byPlanned.get(c.plannedId)
        if (!prev || c.completedAt > prev.completedAt) byPlanned.set(c.plannedId, c)
      }
      if (c.templateId) {
        const prev = byTemplate.get(c.templateId)
        if (!prev || c.completedAt > prev.completedAt) byTemplate.set(c.templateId, c)
      }
    })

    const query = search.trim().toLowerCase()
    if (typeFilter === 'ticket') return []
    const list = plannedItems
      .filter((item) => item.kind === 'preventiu')
      .filter((item) => {
        if (!query) return true
        return item.title.toLowerCase().includes(query)
      })
      .filter((item) => {
        if (!dateRange.start && !dateRange.end) return true
        if (!item.date) return false
        const date = parseISO(item.date)
        const start = dateRange.start ? parseISO(dateRange.start) : null
        const end = dateRange.end ? parseISO(dateRange.end) : null
        if (start && date < start) return false
        if (end && date > new Date(end.getTime() + 24 * 60 * 60 * 1000)) return false
        return true
      })
      .map((item) => {
        const last =
          byPlanned.get(item.id) ||
          (item.templateId ? byTemplate.get(item.templateId) : null) ||
          null
        const progress = getChecklistProgress(last?.checklist)
        return {
          ...item,
          progress,
          completedAt: last?.completedAt || null,
          checklist: last?.checklist || null,
          record: last,
          status: last?.status || 'pendent',
        }
      })
    return list
  }, [plannedItems, completed, search, dateRange, typeFilter])

  const workerOptions = useMemo(() => {
    const userById = new Map(users.map((u) => [String(u.id), u]))
    const set = new Map<string, string>()
    tickets.forEach((t) => {
      const ids = Array.isArray(t.assignedToIds) ? t.assignedToIds : []
      ids.forEach((id) => {
        const u = userById.get(String(id))
        if (!u) return
        set.set(String(id), String(u.name || u.id))
      })
    })
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }))
  }, [users, tickets])

  const { setContent, setOpen } = useFilters()

  const openFiltersPanel = () => {
    setContent(
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Tipus</label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tots</SelectItem>
              <SelectItem value="ticket">Tickets</SelectItem>
              <SelectItem value="preventiu">Preventius</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Treballador</label>
          <Select value={workerFilter} onValueChange={(v) => setWorkerFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tots</SelectItem>
              {workerOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Estat</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Tots" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tots</SelectItem>
              <SelectItem value="validat">Validat</SelectItem>
              <SelectItem value="resolut">Resolut</SelectItem>
              <SelectItem value="en_curs">En curs</SelectItem>
              <SelectItem value="espera">Espera</SelectItem>
              <SelectItem value="assignat">Assignat</SelectItem>
              <SelectItem value="nou">Nou</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
    setOpen(true)
  }

  const handleFilterChange = (f: SmartFiltersChange) => {
    setDateRange({ start: f.start, end: f.end })
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'comercial', 'treballador']}>
      <main className="w-full">
        <ModuleHeader subtitle="Seguiment de tickets" />

        <div className="mx-auto w-full max-w-none px-3 py-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex items-center gap-3 flex-nowrap">
            <SmartFilters
              role="Direcció"
              onChange={handleFilterChange}
              showDepartment={false}
              showWorker={false}
              showLocation={false}
              showStatus={false}
              showImportance={false}
              showAdvanced={false}
              compact
            />
            <div className="flex-1 min-w-[8px]" />
            <FilterButton onClick={openFiltersPanel} />
          </div>
          <div className="mt-3">
            <input
              type="text"
              placeholder="Cerca per codi o maquinària..."
              className="h-8 w-full max-w-sm rounded-full border px-4 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-none px-3 py-4">
          {loading && (
            <p className="text-center text-gray-500 py-10">Carregant...</p>
          )}

          {error && <p className="text-center text-red-600 py-10">{error}</p>}

          {!loading && !error && filteredTickets.length === 0 && (
            <p className="text-center text-gray-400 py-10">
              No hi ha tickets.
            </p>
          )}

          {!loading && !error && (filteredTickets.length > 0 || preventiusRows.length > 0) && (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-indigo-100 text-indigo-900 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Tipus</th>
                    <th className="px-3 py-2 text-left">Codi / Plantilla</th>
                    <th className="px-3 py-2 text-left">Equip</th>
                    <th className="px-3 py-2 text-left">Màquina</th>
                    <th className="px-3 py-2 text-left">Estat / %</th>
                    <th className="px-3 py-2 text-left">Històric</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const names = Array.isArray(ticket.assignedToNames)
                      ? ticket.assignedToNames
                      : []
                    const teamLabel = names.length > 0 ? names.join(', ') : '-'
                    const machineLabel = formatMachine(ticket.machine)
                    return (
                      <tr key={ticket.id} className="border-t">
                        <td className="px-3 py-2">Ticket</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {ticket.incidentNumber || ticket.ticketCode || 'TIC'}
                        </td>
                        <td className="px-3 py-2">{teamLabel}</td>
                        <td className="px-3 py-2 font-semibold">{machineLabel}</td>
                        <td className="px-3 py-2">
                          {STATUS_LABELS[ticket.status]}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setHistoryTicket(ticket)}
                            className="text-xs text-indigo-700 underline"
                          >
                            Històric
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {preventiusRows.map((item) => (
                    <tr key={`preventiu_${item.id}`} className="border-t">
                      <td className="px-3 py-2">Preventiu</td>
                      <td className="px-3 py-2 whitespace-nowrap">{item.title}</td>
                      <td className="px-3 py-2">{item.worker || '-'}</td>
                      <td className="px-3 py-2 font-semibold">{item.location || '-'}</td>
                      <td className="px-3 py-2">
                        {item.status ? `${item.status} · ${item.progress}%` : `${item.progress}%`}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            const url = item.record?.id
                              ? `/menu/manteniment/preventius/completat/${item.record.id}`
                              : `/menu/manteniment/preventius/fulls/${item.id}`
                            const win = window.open(url, '_blank', 'noopener')
                            if (win) win.opener = null
                          }}
                          className="text-xs text-indigo-700 underline"
                        >
                          Checklist
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {historyTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">
                Històric · {historyTicket.ticketCode || historyTicket.incidentNumber}
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setHistoryTicket(null)}
              >
                ×
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              {(historyTicket.statusHistory || []).map((item, idx) => {
                const when = item.at
                  ? format(new Date(item.at as any), 'dd/MM/yyyy HH:mm')
                  : ''
                return (
                  <div key={idx} className="flex justify-between gap-3">
                    <span>{STATUS_LABELS[item.status]}</span>
                    <span className="text-gray-400">{when}</span>
                    <span>{item.byName || ''}</span>
                  </div>
                )
              })}
              {(!historyTicket.statusHistory || historyTicket.statusHistory.length === 0) && (
                <div className="text-gray-400">Sense historial.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </RoleGuard>
  )
}
