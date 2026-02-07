'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import { normalizeRole } from '@/lib/roles'

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
  createdByName?: string
  assignedToIds?: string[]
  assignedToNames?: string[]
  statusHistory?: Array<{
    status: TicketStatus
    at?: number | string | null
    byName?: string | null
  }>
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
  const base = ticket.createdAt
  if (!base) return null
  const date = typeof base === 'string' ? new Date(base) : new Date(Number(base))
  if (Number.isNaN(date.getTime())) return null
  return date
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

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [historyTicket, setHistoryTicket] = useState<Ticket | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name?: string; department?: string }>>([])
  const [departmentFilter, setDepartmentFilter] = useState('__all__')
  const [workerFilter, setWorkerFilter] = useState('__all__')

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== '__all__') {
        params.set('status', statusFilter)
      }
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

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase()
    const userById = new Map(users.map((u) => [String(u.id), u]))
    const list = tickets.filter((ticket) => {
      if (departmentFilter !== '__all__') {
        const ids = Array.isArray(ticket.assignedToIds) ? ticket.assignedToIds : []
        const hasDept = ids.some((id) => {
          const u = userById.get(String(id))
          const dep = String(u?.department || '').toLowerCase()
          return dep === departmentFilter
        })
        if (!hasDept) return false
      }

      if (workerFilter !== '__all__') {
        const ids = Array.isArray(ticket.assignedToIds) ? ticket.assignedToIds : []
        if (!ids.map(String).includes(workerFilter)) return false
      }

      if (!query) return true
      const code = (ticket.ticketCode || ticket.incidentNumber || '').toLowerCase()
      const machine = (ticket.machine || '').toLowerCase()
      return code.includes(query) || machine.includes(query)
    })

    list.sort((a, b) => {
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

    return list
  }, [tickets, search, departmentFilter, workerFilter, users])

  const departmentOptions = useMemo(() => {
    const userById = new Map(users.map((u) => [String(u.id), u]))
    const set = new Set<string>()
    tickets.forEach((t) => {
      const ids = Array.isArray(t.assignedToIds) ? t.assignedToIds : []
      ids.forEach((id) => {
        const dep = String(userById.get(String(id))?.department || '').toLowerCase()
        if (dep) set.add(dep)
      })
    })
    return Array.from(set).sort()
  }, [users, tickets])

  const workerOptions = useMemo(() => {
    const userById = new Map(users.map((u) => [String(u.id), u]))
    const set = new Map<string, string>()
    tickets.forEach((t) => {
      const ids = Array.isArray(t.assignedToIds) ? t.assignedToIds : []
      ids.forEach((id) => {
        const u = userById.get(String(id))
        if (!u) return
        const dep = String(u.department || '').toLowerCase()
        if (departmentFilter !== '__all__' && dep !== departmentFilter) return
        set.set(String(id), String(u.name || u.id))
      })
    })
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }))
  }, [users, tickets, departmentFilter])

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'comercial', 'treballador']}>
      <main className="w-full">
        <ModuleHeader subtitle="Seguiment de tickets" />

        <div className="mx-auto w-full max-w-none px-3 flex flex-wrap items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Cerca per codi o maquinària..."
            className="h-8 w-full max-w-sm rounded-full border px-4 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-full border px-3 text-xs bg-white"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value)
                setWorkerFilter('__all__')
              }}
            >
              <option value="__all__">Tots els departaments</option>
              {departmentOptions.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-full border px-3 text-xs bg-white"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            >
              <option value="__all__">Tots els treballadors</option>
              {workerOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:flex flex-wrap items-center gap-2 justify-end flex-1">
            {[
              { value: '__all__', label: 'Tots' },
              { value: 'validat', label: 'Validat' },
              { value: 'resolut', label: 'Resolut' },
              { value: 'en_curs', label: 'En curs' },
              { value: 'espera', label: 'Espera' },
              { value: 'assignat', label: 'Assignat' },
              { value: 'nou', label: 'Nou' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value as any)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  statusFilter === opt.value
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
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

          {!loading && !error && filteredTickets.length > 0 && (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-indigo-100 text-indigo-900 font-semibold">
                  <tr>
                    <th className="px-3 py-2 text-left">Codi</th>
                    <th className="px-3 py-2 text-left">Equip</th>
                    <th className="px-3 py-2 text-left">Màquina</th>
                    <th className="px-3 py-2 text-left">Estat</th>
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
