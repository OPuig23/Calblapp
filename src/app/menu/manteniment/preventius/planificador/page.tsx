'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import FiltersBar, { type FiltersState } from '@/components/layout/FiltersBar'

type Template = {
  id: string
  name: string
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  location?: string
  primaryOperator?: string
  backupOperator?: string
}

type TicketCard = {
  id: string
  code: string
  title: string
  priority: 'urgent' | 'alta' | 'normal' | 'baixa'
  minutes: number
  location?: string
  machine?: string
}

type ScheduledItem = {
  id: string
  kind: 'preventiu' | 'ticket'
  title: string
  workers: string[]
  workersCount: number
  dayIndex: number
  start: string
  end: string
  minutes: number
  priority?: 'urgent' | 'alta' | 'normal' | 'baixa'
  location?: string
  machine?: string
  templateId?: string | null
  ticketId?: string | null
}

const ROW_HEIGHT = 40
const GRID_GAP = 1
const HEADER_HEIGHT = 32
const TIME_COL_WIDTH = 80
const DAY_COUNT = 6

const normalizeName = (value: string) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

export default function PreventiusPlanificadorPage() {
  const [filters, setFiltersState] = useState<FiltersState>(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 })
    const end = endOfWeek(base, { weekStartsOn: 1 })
    return {
      start: format(base, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      mode: 'week',
    }
  })
  const [tab, setTab] = useState<'preventius' | 'tickets'>('preventius')
  const [templates, setTemplates] = useState<Template[]>([])
  const [realTickets, setRealTickets] = useState<TicketCard[]>([])
  const [machines, setMachines] = useState<Array<{ code: string; name: string; label: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; department?: string }>>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<{
    id?: string
    kind: 'preventiu' | 'ticket'
    templateId?: string | null
    ticketId?: string | null
    title: string
    dayIndex: number
    start: string
    duration: number
    end: string
    workersCount: number
    workers: string[]
    priority: 'urgent' | 'alta' | 'normal' | 'baixa'
    location: string
    machine: string
  } | null>(null)

  const setFilters = (partial: Partial<FiltersState>) =>
    setFiltersState((prev) => ({ ...prev, ...partial }))

  const weekStart = useMemo(() => parseISO(filters.start), [filters.start])
  const weekLabel = format(weekStart, "yyyy-'W'II")
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const visibleItems = useMemo(() => {
    if (tab === 'preventius') return templates
    return realTickets
  }, [tab, templates, realTickets])

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = 8; h <= 16; h += 1) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    slots.push('17:00')
    return slots
  }, [])

  useEffect(() => {
    if (tab !== 'tickets') return
    const loadTickets = async () => {
      try {
        const res = await fetch('/api/maintenance/tickets?ticketType=maquinaria', {
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        const list = Array.isArray(json?.tickets) ? json.tickets : []
        const mapped = list
          .filter((t: any) => !['resolut', 'validat'].includes(String(t.status || '')))
          .map((t: any) => {
            const code = t.ticketCode || t.incidentNumber || 'TIC'
            const title = t.description || t.machine || t.location || ''
            const minutes = Number(t.estimatedMinutes || 60)
            return {
              id: String(t.id || code),
              code,
              title,
              priority: (t.priority || 'normal') as TicketCard['priority'],
              minutes,
              location: t.location || '',
              machine: t.machine || '',
            }
          })
        setRealTickets(mapped)
      } catch {
        return
      }
    }
    loadTickets()
  }, [tab])

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await fetch('/api/maintenance/templates', { cache: 'no-store' })
        if (!res.ok) {
          setTemplates([])
          return
        }
        const json = await res.json()
        const list = Array.isArray(json?.templates) ? json.templates : []
        const mapped = list
          .filter((t: any) => t?.id && (t?.name || t?.title))
          .map((t: any) => ({
            id: String(t.id),
            name: String(t.name || t.title || ''),
            periodicity: t.periodicity,
            location: t.location || '',
            primaryOperator: t.primaryOperator || '',
            backupOperator: t.backupOperator || '',
          }))
        setTemplates(mapped)
      } catch {
        setTemplates([])
      }
    }
    loadTemplates()
  }, [])

  useEffect(() => {
    const loadMachines = async () => {
      try {
        const res = await fetch('/api/maintenance/machines', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        setMachines(Array.isArray(json?.machines) ? json.machines : [])
      } catch {
        setMachines([])
      }
    }
    loadMachines()
  }, [])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const list = Array.isArray(json) ? json : []
        const mapped = list
          .filter((u: any) => u?.id && u?.name)
          .map((u: any) => ({
            id: String(u.id),
            name: String(u.name),
            department: (u.departmentLower || u.department || '').toString(),
          }))
        setUsers(mapped)
      } catch {
        setUsers([])
      }
    }
    loadUsers()
  }, [])

  const loadWeekSchedule = async () => {
    const startStr = format(weekStart, 'yyyy-MM-dd')
    const endStr = format(addDays(weekStart, DAY_COUNT - 1), 'yyyy-MM-dd')
    try {
      const [plannedRes, ticketsRes] = await Promise.all([
        fetch(
          `/api/maintenance/preventius/planned?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
          { cache: 'no-store' }
        ),
        fetch('/api/maintenance/tickets?ticketType=maquinaria', { cache: 'no-store' }),
      ])

      const plannedJson = plannedRes.ok ? await plannedRes.json() : { items: [] }
      const plannedList = Array.isArray(plannedJson?.items) ? plannedJson.items : []
      const plannedMapped: ScheduledItem[] = plannedList
        .map((p: any) => {
          const date = parseISO(String(p.date || ''))
          const dayIndex = Math.round((date.getTime() - weekStart.getTime()) / 86400000)
          if (dayIndex < 0 || dayIndex >= DAY_COUNT) return null
          const startTime = String(p.startTime || '')
          const endTime = String(p.endTime || '')
          if (!startTime || !endTime) return null
          const minutes = Math.max(30, minutesFromTime(endTime) - minutesFromTime(startTime))
          const workers = Array.isArray(p.workerNames) ? p.workerNames.map(String) : []
          return {
            id: String(p.id || ''),
            kind: 'preventiu' as const,
            title: String(p.title || ''),
            workers,
            workersCount: workers.length || 1,
            dayIndex,
            start: startTime,
            end: endTime,
            minutes,
            location: String(p.location || ''),
            templateId: p.templateId || null,
            ticketId: null,
          }
        })
        .filter(Boolean) as ScheduledItem[]

      const ticketsJson = ticketsRes.ok ? await ticketsRes.json() : { tickets: [] }
      const ticketList = Array.isArray(ticketsJson?.tickets) ? ticketsJson.tickets : []
      const ticketsMapped: ScheduledItem[] = ticketList
        .filter((t: any) => t.plannedStart && t.plannedEnd)
        .map((t: any) => {
          const start = new Date(Number(t.plannedStart))
          const end = new Date(Number(t.plannedEnd))
          const date = format(start, 'yyyy-MM-dd')
          if (date < startStr || date > endStr) return null
          const dayIndex = Math.round(
            (parseISO(date).getTime() - weekStart.getTime()) / 86400000
          )
          if (dayIndex < 0 || dayIndex >= DAY_COUNT) return null
          const workers = Array.isArray(t.assignedToNames) ? t.assignedToNames.map(String) : []
          const title = String(t.description || t.machine || t.location || '')
          const code = String(t.ticketCode || t.incidentNumber || 'TIC')
          return {
            id: String(t.id || ''),
            kind: 'ticket' as const,
            title: `${code} - ${title}`.trim(),
            workers,
            workersCount: workers.length || 1,
            dayIndex,
            start: format(start, 'HH:mm'),
            end: format(end, 'HH:mm'),
            minutes: Math.max(30, Number(t.estimatedMinutes || 60)),
            priority: (t.priority || 'normal') as any,
            location: String(t.location || ''),
            machine: String(t.machine || ''),
            templateId: null,
            ticketId: String(t.id || ''),
          }
        })
        .filter(Boolean) as ScheduledItem[]

      setScheduledItems([...plannedMapped, ...ticketsMapped])
    } catch {
      setScheduledItems([])
    }
  }

  useEffect(() => {
    loadWeekSchedule()
    const onFocus = () => loadWeekSchedule()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [weekStart])

  const getRowIndex = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    const minutesFromStart = (hh - 8) * 60 + mm
    return Math.max(0, Math.floor(minutesFromStart / 30))
  }

  const minutesFromTime = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    return hh * 60 + mm
  }

  const timeFromMinutes = (total: number) => {
    const hh = Math.floor(total / 60)
    const mm = total % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }

  const getWorkerConflicts = (
    dayIndex: number,
    start: string,
    end: string,
    workers: string[],
    ignoreId?: string
  ) => {
    const startMin = minutesFromTime(start)
    const endMin = minutesFromTime(end)
    const conflicts = new Set<string>()
    scheduledItems.forEach((i) => {
      if (ignoreId && i.id === ignoreId) return
      if (i.dayIndex !== dayIndex) return
      const s = minutesFromTime(i.start)
      const e = minutesFromTime(i.end)
      const overlaps = startMin < e && endMin > s
      if (!overlaps) return
      i.workers.forEach((w) => {
        if (workers.includes(w)) conflicts.add(w)
      })
    })
    return Array.from(conflicts)
  }

  const availableWorkers = (dayIndex: number, start: string, end: string, ignoreId?: string) => {
    const operators =
      users
        .filter((u) => normalizeName(u.department || '').includes('manten'))
        .map((u) => ({ id: u.id, name: u.name })) || []
    const list = operators.length > 0 ? operators : users.map((u) => ({ id: u.id, name: u.name }))
    return list.filter((op) => {
      const has = scheduledItems.some((i) => {
        if (ignoreId && i.id === ignoreId) return false
        if (i.dayIndex !== dayIndex) return false
        const s = minutesFromTime(i.start)
        const e = minutesFromTime(i.end)
        const startMin = minutesFromTime(start)
        const endMin = minutesFromTime(end)
        const overlaps = startMin < e && endMin > s
        return overlaps && i.workers.includes(op.name)
      })
      return !has
    })
  }

  const resolveWorkerIds = (names: string[]) => {
    if (users.length === 0) return []
    const map = new Map(
      users.map((u) => [normalizeName(u.name), u.id])
    )
    return names
      .map((n) => map.get(normalizeName(n)))
      .filter((id): id is string => Boolean(id))
  }

  const persistTicketPlanning = async (item: ScheduledItem) => {
    const ticketId = item.ticketId || (item.kind === 'ticket' ? item.id : null)
    if (!ticketId) return
    const day = addDays(weekStart, item.dayIndex)
    const dateStr = format(day, 'yyyy-MM-dd')
    const plannedStart = new Date(`${dateStr}T${item.start}:00`).getTime()
    const plannedEnd = new Date(`${dateStr}T${item.end}:00`).getTime()
    const assignedToNames = item.workers || []
    const assignedToIds = resolveWorkerIds(assignedToNames)

    try {
      await fetch(`/api/maintenance/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedStart,
          plannedEnd,
          estimatedMinutes: item.minutes,
          location: item.location || undefined,
          machine: item.machine || undefined,
          assignedToNames: assignedToNames.length ? assignedToNames : undefined,
          assignedToIds: assignedToIds.length ? assignedToIds : undefined,
        }),
      })
    } catch {
      return
    }
  }

  const openModal = (next: typeof draft) => {
    setDraft(next)
    setIsModalOpen(true)
  }

  const handleDrop = (dayIndex: number, startTime: string, data: string) => {
    try {
      const payload = JSON.parse(data) as
        | {
            type: 'card'
            kind: 'preventiu'
            templateId: string
            title: string
            minutes: number
            location?: string
          }
        | {
            type: 'card'
            kind: 'ticket'
            ticketId: string
            title: string
            minutes: number
            location?: string
            machine?: string
          }
        | { type: 'scheduled'; id: string }

      if (payload.type === 'scheduled') {
        const target = scheduledItems.find((i) => i.id === payload.id)
        if (!target) return
        const duration = minutesFromTime(target.end) - minutesFromTime(target.start)
        const newStart = startTime
        const newEnd = timeFromMinutes(minutesFromTime(newStart) + Math.max(30, duration))
      openModal({
        id: target.id,
        kind: target.kind,
        templateId: target.templateId || null,
        ticketId: target.ticketId || (target.kind === 'ticket' ? target.id : null),
        title: target.title,
        dayIndex,
        start: newStart,
        duration,
        end: newEnd,
        workersCount: target.workersCount,
        workers: target.workers,
        priority: target.priority || 'normal',
        location: target.location || '',
        machine: target.machine || '',
      })
        return
      }

      if (payload.kind === 'ticket') {
        const alreadyPlanned = scheduledItems.some(
          (i) => i.kind === 'ticket' && (i.ticketId || i.id) === payload.ticketId
        )
        if (alreadyPlanned) return
      } else {
        const alreadyPlanned = scheduledItems.some(
          (i) => i.kind === 'preventiu' && i.templateId === payload.templateId
        )
        if (alreadyPlanned) return
      }
      openModal({
        kind: payload.kind,
        templateId: payload.kind === 'preventiu' ? payload.templateId : null,
        ticketId: payload.kind === 'ticket' ? payload.ticketId : null,
        title: payload.title,
        dayIndex,
        start: startTime,
        duration: payload.minutes,
        end: timeFromMinutes(minutesFromTime(startTime) + payload.minutes),
        workersCount: 1,
        workers: [],
        priority: 'normal',
        location: payload.location || '',
        machine: payload.kind === 'ticket' ? payload.machine || '' : '',
      })
    } catch {
      return
    }
  }

  const handleEdit = (item: ScheduledItem) => {
    const duration = minutesFromTime(item.end) - minutesFromTime(item.start)
      openModal({
        id: item.id,
        kind: item.kind,
        templateId: item.templateId || null,
        ticketId: item.ticketId || (item.kind === 'ticket' ? item.id : null),
        title: item.title,
        dayIndex: item.dayIndex,
        start: item.start,
        duration,
        end: item.end,
        workersCount: item.workersCount,
        workers: item.workers,
        priority: item.priority || 'normal',
        location: item.location || '',
        machine: item.machine || '',
      })
  }

  const handleCreateEmpty = (dayIndex: number, startTime: string) => {
    if (tab !== 'preventius') return
      openModal({
        kind: 'preventiu',
        templateId: null,
        title: '',
        dayIndex,
        start: startTime,
        duration: 60,
        end: timeFromMinutes(minutesFromTime(startTime) + 60),
        workersCount: 1,
        workers: [],
        priority: 'normal',
        location: '',
        machine: '',
      })
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-none mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Planificacio setmanal (dl–dv)" />

        <FiltersBar filters={filters} setFilters={setFilters} />

        <div className="hidden lg:block space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">DL–DS · Jornada base 08:00–17:00</div>
            <div className="text-xs text-gray-500">Setmana: {weekLabel}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('preventius')}
              className={[
                'rounded-full px-4 py-2 text-xs font-semibold border',
                tab === 'preventius'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200',
              ].join(' ')}
            >
              Preventius
            </button>
            <button
              type="button"
              onClick={() => setTab('tickets')}
              className={[
                'rounded-full px-4 py-2 text-xs font-semibold border',
                tab === 'tickets'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200',
              ].join(' ')}
            >
              Tickets
            </button>
          </div>

          <div className="grid grid-cols-[200px_1fr] gap-3">
            <div className="rounded-2xl border bg-white p-3">
              <div className="text-xs font-semibold text-gray-900">
                {tab === 'preventius' ? 'Preventius pendents' : 'Tickets pendents'}
              </div>
              <div className="mt-3 space-y-2">
                {tab === 'preventius' &&
                  (visibleItems as Template[]).map((t) => {
                    const alreadyPlanned = scheduledItems.some(
                      (i) => i.kind === 'preventiu' && i.templateId === t.id
                    )
                    return (
                      <div
                        key={t.id}
                        className={[
                          'rounded-lg border px-2 py-2 text-[11px] bg-white',
                          alreadyPlanned ? 'opacity-40 cursor-not-allowed' : 'cursor-grab',
                        ].join(' ')}
                        draggable={!alreadyPlanned}
                        title={alreadyPlanned ? 'Ja planificat' : 'Arrossega al calendari'}
                        onDragStart={(e) => {
                          if (alreadyPlanned) return
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({
                              type: 'card',
                              kind: 'preventiu',
                              templateId: t.id,
                              title: t.name,
                              minutes: 60,
                              location: t.location || '',
                            })
                          )
                        }}
                      >
                        <div className="font-semibold text-gray-900 leading-snug">{t.name}</div>
                        {t.location && <div className="text-[10px] text-gray-600">{t.location}</div>}
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-600">
                          <span>{t.periodicity || '—'}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">Plantilla</span>
                        </div>
                      </div>
                    )
                  })}
                {tab === 'tickets' &&
                  (visibleItems as TicketCard[]).map((t) => {
                    const alreadyPlanned = scheduledItems.some(
                      (i) => i.kind === 'ticket' && (i.ticketId || i.id) === t.id
                    )
                    return (
                      <div
                        key={t.id}
                        className={[
                          'rounded-lg border px-2 py-2 text-[11px] bg-white',
                          alreadyPlanned ? 'opacity-40 cursor-not-allowed' : 'cursor-grab',
                        ].join(' ')}
                        draggable={!alreadyPlanned}
                        title={alreadyPlanned ? 'Ja planificat' : 'Arrossega al calendari'}
                        onDragStart={(e) => {
                          if (alreadyPlanned) return
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify({
                              type: 'card',
                              kind: 'ticket',
                              ticketId: t.id,
                              title: `${t.code} - ${t.title}`.trim(),
                              minutes: t.minutes,
                              location: t.location || '',
                              machine: t.machine || '',
                            })
                          )
                        }}
                      >
                        <div className="font-semibold text-gray-900 leading-snug">
                          {t.code} · {t.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-600">
                          <span>{t.minutes} min</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">{t.priority}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                Arrossega cards al calendari i edita hora inici/fi i operari.
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3 overflow-x-auto relative">
              <div
                className="grid gap-px bg-gray-100 text-xs"
                style={{
                  gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAY_COUNT}, minmax(160px, 1fr))`,
                  gridTemplateRows: `${HEADER_HEIGHT}px repeat(${timeSlots.length - 1}, ${ROW_HEIGHT}px)`,
                }}
              >
                <div className="bg-white" />
                {days.map((d, i) => (
                  <div key={i} className="bg-white px-2 py-2 font-semibold text-gray-700">
                    {format(d, 'EEE dd/MM')}
                  </div>
                ))}

                {timeSlots.slice(0, -1).map((t, rowIdx) => (
                  <React.Fragment key={t}>
                    <div className="bg-white px-2 py-2 text-gray-500">{t}</div>
                    {days.map((_, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className="bg-white"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const data = e.dataTransfer.getData('text/plain')
                          handleDrop(colIdx, t, data)
                        }}
                        onClick={() => handleCreateEmpty(colIdx, t)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAY_COUNT}, minmax(160px, 1fr))`,
                  gridTemplateRows: `${HEADER_HEIGHT}px repeat(${timeSlots.length - 1}, ${ROW_HEIGHT}px)`,
                  gap: `${GRID_GAP}px`,
                }}
              >
                <div />
                {days.map((_, colIdx) => {
                  const dayItems = scheduledItems
                    .filter((i) => i.dayIndex === colIdx)
                    .map((i) => ({
                      item: i,
                      startMin: minutesFromTime(i.start),
                      endMin: minutesFromTime(i.end),
                    }))
                    .sort((a, b) => a.startMin - b.startMin)

                  const positioned: Array<{ item: ScheduledItem; col: number; group: number }> = []
                  let active: Array<{ endMin: number; col: number; group: number }> = []
                  let groupId = 0

                  dayItems.forEach((entry) => {
                    active = active.filter((a) => a.endMin > entry.startMin)
                    if (active.length === 0) groupId += 1
                    const used = new Set(active.map((a) => a.col))
                    let col = 0
                    while (used.has(col)) col += 1
                    active.push({ endMin: entry.endMin, col, group: groupId })
                    positioned.push({ item: entry.item, col, group: groupId })
                  })

                  const groupMax: Record<number, number> = {}
                  positioned.forEach((p) => {
                    groupMax[p.group] = Math.max(groupMax[p.group] || 0, p.col + 1)
                  })

                  const gapPx = 8

                  return (
                    <div
                      key={colIdx}
                      className="relative overflow-hidden"
                      style={{
                        gridColumn: `${colIdx + 2} / ${colIdx + 3}`,
                        gridRow: `2 / span ${timeSlots.length - 1}`,
                      }}
                    >
                      {positioned.map(({ item, col, group }) => {
                        const rowStart = getRowIndex(item.start)
                        const rowEnd = getRowIndex(item.end)
                        const rows = Math.max(1, rowEnd - rowStart)
                        const height = rows * ROW_HEIGHT + Math.max(0, rows - 1) * GRID_GAP
                        const top = rowStart * (ROW_HEIGHT + GRID_GAP)
                        const columns = Math.max(1, groupMax[group])
                        const widthPercent = 100 / columns
                        const leftPercent = col * widthPercent
                        const bg =
                          item.kind === 'preventiu'
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-sky-50 border-sky-200'
                        return (
                          <div
                            key={item.id}
                            className={`absolute border ${bg} rounded-lg px-2 py-1 text-[11px] text-gray-800 cursor-pointer pointer-events-auto`}
                            style={{
                              top,
                              height,
                              width: `calc(${widthPercent}% - ${gapPx}px)`,
                              left: `calc(${leftPercent}% + ${gapPx / 2}px)`,
                              boxSizing: 'border-box',
                              maxWidth: '100%',
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'text/plain',
                                JSON.stringify({ type: 'scheduled', id: item.id })
                              )
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              const data = e.dataTransfer.getData('text/plain')
                              handleDrop(item.dayIndex, item.start, data)
                            }}
                            onClick={() => handleEdit(item)}
                          >
                            <div className="font-semibold leading-snug line-clamp-3">
                              {item.title}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Disponibilitat: un operari esta lliure si no te cap tasca solapada en aquella franja.
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && draft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {draft.title ? draft.title : draft.id ? 'Editar' : 'Nova tasca'}
                </div>
                <button
                  type="button"
                  className="text-sm text-gray-500"
                  onClick={() => setIsModalOpen(false)}
                >
                  Tancar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Tipus</span>
                  <select
                    className="h-10 rounded-xl border px-3"
                    value={draft.kind}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, kind: e.target.value as any } : d))
                    }
                    disabled={!!draft.id}
                  >
                    <option value="preventiu">Preventiu</option>
                    <option value="ticket">Ticket</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Titol</span>
                  <input
                    className="h-10 rounded-xl border px-3"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                    placeholder="Nom del preventiu o ticket"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Hora inici</span>
                  <input
                    type="time"
                    className="h-10 rounded-xl border px-3"
                    value={draft.start}
                    onChange={(e) => {
                      const start = e.target.value
                      const end = timeFromMinutes(minutesFromTime(start) + draft.duration)
                      setDraft((d) => (d ? { ...d, start, end } : d))
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Durada (min)</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border px-3"
                    value={draft.duration}
                    onChange={(e) => {
                      const duration = Math.max(15, Number(e.target.value) || 0)
                      const end = timeFromMinutes(minutesFromTime(draft.start) + duration)
                      setDraft((d) => (d ? { ...d, duration, end } : d))
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Hora fi</span>
                  <input
                    type="time"
                    className="h-10 rounded-xl border px-3"
                    value={draft.end}
                    onChange={(e) => {
                      const end = e.target.value
                      const duration = minutesFromTime(end) - minutesFromTime(draft.start)
                      setDraft((d) =>
                        d ? { ...d, end, duration: Math.max(15, duration) } : d
                      )
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Nº treballadors</span>
                  <input
                    type="number"
                    className="h-10 rounded-xl border px-3"
                    value={draft.workersCount}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, workersCount: Math.max(1, Number(e.target.value) || 1) } : d
                      )
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs text-gray-600">Assignar treballadors</span>
                  <div className="flex flex-wrap gap-2">
                    {availableWorkers(draft.dayIndex, draft.start, draft.end, draft.id).map((op) => {
                      const checked = draft.workers.includes(op.name)
                      return (
                        <label key={op.id} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setDraft((d) => {
                                if (!d) return d
                                if (checked) {
                                  return { ...d, workers: d.workers.filter((w) => w !== op.name) }
                                }
                                return { ...d, workers: [...d.workers, op.name] }
                              })
                            }}
                          />
                          {op.name}
                        </label>
                      )
                    })}
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Urgencia</span>
                  <select
                    className="h-10 rounded-xl border px-3"
                    value={draft.priority}
                    onChange={(e) =>
                      setDraft((d) => (d ? { ...d, priority: e.target.value as any } : d))
                    }
                  >
                    <option value="urgent">Urgent</option>
                    <option value="alta">Alta</option>
                    <option value="normal">Normal</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Ubicacio</span>
                  <input
                    className="h-10 rounded-xl border px-3"
                    value={draft.location}
                    onChange={(e) => setDraft((d) => (d ? { ...d, location: e.target.value } : d))}
                    placeholder="Sala / zona"
                  />
                </label>
                {draft.kind === 'ticket' && (
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-gray-600">Maquinaria</span>
                    <select
                      className="h-10 rounded-xl border px-3"
                      value={draft.machine}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, machine: e.target.value } : d))
                      }
                    >
                      <option value="">Selecciona maquinaria</option>
                      {machines.map((m) => (
                        <option key={`${m.code}-${m.name}`} value={m.label}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {getWorkerConflicts(draft.dayIndex, draft.start, draft.end, draft.workers, draft.id)
                .length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Atencio: aquests operaris ja tenen una tasca en aquesta franja:{' '}
                  {getWorkerConflicts(
                    draft.dayIndex,
                    draft.start,
                    draft.end,
                    draft.workers,
                    draft.id
                  ).join(', ')}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                {draft.id ? (
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-xs text-red-600"
                    onClick={async () => {
                      if (!draft?.id) return
                      if (draft.kind === 'preventiu') {
                        try {
                          await fetch(`/api/maintenance/preventius/planned/${draft.id}`, {
                            method: 'DELETE',
                          })
                        } catch {
                          // ignore
                        }
                        setIsModalOpen(false)
                        loadWeekSchedule()
                        return
                      }

                      const ticketId = draft.ticketId || draft.id
                      if (!ticketId) return
                      try {
                        await fetch(`/api/maintenance/tickets/${ticketId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            plannedStart: null,
                            plannedEnd: null,
                            estimatedMinutes: null,
                          }),
                        })
                      } catch {
                        // ignore
                      }
                      setIsModalOpen(false)
                      loadWeekSchedule()
                    }}
                  >
                    Eliminar
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-xs text-gray-600"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      if (!draft.start || !draft.end) return
                      if (draft.kind === 'ticket') {
                        const ticketId = draft.ticketId || draft.id
                        if (!ticketId) {
                          alert('Arrossega un ticket des de la columna lateral.')
                          return
                        }
                        const nextItem: ScheduledItem = {
                          id: ticketId,
                          kind: 'ticket',
                          ticketId,
                          title: draft.title,
                          workers: draft.workers,
                          workersCount: draft.workersCount,
                          dayIndex: draft.dayIndex,
                          start: draft.start,
                          end: draft.end,
                          minutes: draft.duration,
                          priority: draft.priority,
                          location: draft.location,
                          machine: draft.machine,
                          templateId: null,
                        }
                        setScheduledItems((prev) => {
                          const next = prev.filter((i) => i.id !== ticketId)
                          return [...next, nextItem]
                        })
                        await persistTicketPlanning(nextItem)
                        setIsModalOpen(false)
                        loadWeekSchedule()
                        return
                      }

                      if (!draft.title) {
                        alert('Omple el titol del preventiu.')
                        return
                      }

                      const dateStr = format(addDays(weekStart, draft.dayIndex), 'yyyy-MM-dd')
                      const workerNames = draft.workers || []
                      const workerIds = resolveWorkerIds(workerNames)
                      const payload = {
                        templateId: draft.templateId || null,
                        title: draft.title,
                        date: dateStr,
                        startTime: draft.start,
                        endTime: draft.end,
                        location: draft.location || '',
                        workerNames,
                        workerIds,
                      }

                      try {
                        if (draft.id) {
                          await fetch(`/api/maintenance/preventius/planned/${draft.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          })
                        } else {
                          const res = await fetch('/api/maintenance/preventius/planned', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                          })
                          if (!res.ok) throw new Error('create_failed')
                          const json = await res.json().catch(() => null)
                          const newId = json?.id ? String(json.id) : null
                          if (newId) {
                            setScheduledItems((prev) => [
                              ...prev,
                              {
                                id: newId,
                                kind: 'preventiu',
                                templateId: payload.templateId,
                                ticketId: null,
                                title: payload.title,
                                workers: workerNames,
                                workersCount: workerNames.length || 1,
                                dayIndex: draft.dayIndex,
                                start: payload.startTime,
                                end: payload.endTime,
                                minutes: draft.duration,
                                location: payload.location,
                              } as ScheduledItem,
                            ])
                          }
                        }
                      } catch {
                        alert('No s’ha pogut guardar el preventiu.')
                      }
                      setIsModalOpen(false)
                      loadWeekSchedule()
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
