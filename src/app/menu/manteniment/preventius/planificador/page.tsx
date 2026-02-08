'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, endOfWeek, format, parseISO, startOfWeek } from 'date-fns'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import FiltersBar, { type FiltersState } from '@/components/layout/FiltersBar'

type MockTask = {
  id: string
  title: string
  asset: string
  minutes: number
  allowedOperators: string[]
}

type MockTicket = {
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
  date?: string
  meta?: string
  priority?: 'urgent' | 'alta' | 'normal' | 'baixa'
  location?: string
  machine?: string
  sourceId?: string
}

const ROW_HEIGHT = 40
const GRID_GAP = 1
const HEADER_HEIGHT = 32
const TIME_COL_WIDTH = 80
const DAY_COUNT = 6

const MOCK_OPERATORS = [
  { id: 'javi', name: 'Javi' },
  { id: 'dani', name: 'Dani' },
  { id: 'pep', name: 'Pep' },
  { id: 'fernando', name: 'Fernando' },
]

const normalizeName = (value: string) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const MOCK_TASKS: MockTask[] = [
  {
    id: 'fuites-gas-central',
    title: 'Preventiu fuites de gas',
    asset: 'Central alta temperatura',
    minutes: 120,
    allowedOperators: ['javi', 'dani', 'fernando', 'pep'],
  },
  {
    id: 'fuites-gas-negativa',
    title: 'Preventiu fuites de gas',
    asset: 'Condensador negativa',
    minutes: 60,
    allowedOperators: ['javi', 'dani'],
  },
  {
    id: 'fuites-gas-abatidor',
    title: 'Preventiu fuites de gas',
    asset: 'Condensador abatidor',
    minutes: 75,
    allowedOperators: ['pep', 'fernando'],
  },
]

const MOCK_TICKETS: MockTicket[] = [
  {
    id: 'tk1',
    code: 'TIC000128',
    title: 'Vibracio motor cinta',
    priority: 'alta',
    minutes: 60,
    machine: '',
  },
  {
    id: 'tk2',
    code: 'TIC000131',
    title: 'Soroll anormal AACC',
    priority: 'normal',
    minutes: 45,
    machine: '',
  },
]

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
  const [realTickets, setRealTickets] = useState<MockTicket[]>([])
  const [machines, setMachines] = useState<Array<{ code: string; name: string; label: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string; department?: string }>>([])
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<{
    id?: string
    kind: 'preventiu' | 'ticket'
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
    meta?: string
    sourceId?: string
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
    if (tab === 'preventius') return MOCK_TASKS
    return realTickets.length > 0 ? realTickets : MOCK_TICKETS
  }, [tab, realTickets])

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
              priority: (t.priority || 'normal') as MockTicket['priority'],
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('maintenance.planificador.items')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScheduledItems(parsed)
          return
        }
      }
    } catch {
      // ignore parse errors
    }
    setScheduledItems([
      {
        id: 's1',
        kind: 'preventiu',
        title: 'Preventiu fuites de gas',
        workers: ['Javi'],
        workersCount: 1,
        dayIndex: 0,
        start: '09:00',
        end: '11:00',
        minutes: 120,
        meta: 'Central alta temperatura',
        sourceId: 'fuites-gas-central',
      },
      {
        id: 's2',
        kind: 'preventiu',
        title: 'Preventiu fuites de gas',
        workers: ['Dani'],
        workersCount: 1,
        dayIndex: 0,
        start: '09:30',
        end: '10:30',
        minutes: 60,
        meta: 'Condensador negativa',
        sourceId: 'fuites-gas-negativa',
      },
      {
        id: 's3',
        kind: 'preventiu',
        title: 'Preventiu fuites de gas',
        workers: ['Pep'],
        workersCount: 1,
        dayIndex: 2,
        start: '14:00',
        end: '15:15',
        minutes: 75,
        meta: 'Condensador abatidor',
        sourceId: 'fuites-gas-abatidor',
      },
      {
        id: 's4',
        kind: 'ticket',
        title: 'TIC000128 · Vibracio motor cinta',
        workers: ['Fernando'],
        workersCount: 1,
        dayIndex: 1,
        start: '10:00',
        end: '11:00',
        minutes: 60,
        priority: 'alta',
        location: 'Sala envasat',
        sourceId: 'tk1',
      },
    ])
  }, [])

  useEffect(() => {
    try {
      const payload = scheduledItems.map((item) => ({
        ...item,
        date: format(addDays(weekStart, item.dayIndex), 'yyyy-MM-dd'),
      }))
      localStorage.setItem('maintenance.planificador.items', JSON.stringify(payload))
    } catch {
      return
    }
  }, [scheduledItems, weekStart])

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
    return MOCK_OPERATORS.filter((op) => {
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
    if (!item.sourceId) return
    const day = addDays(weekStart, item.dayIndex)
    const dateStr = format(day, 'yyyy-MM-dd')
    const plannedStart = new Date(`${dateStr}T${item.start}:00`).getTime()
    const plannedEnd = new Date(`${dateStr}T${item.end}:00`).getTime()
    const assignedToNames = item.workers || []
    const assignedToIds = resolveWorkerIds(assignedToNames)

    try {
      await fetch(`/api/maintenance/tickets/${item.sourceId}`, {
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
        | { type: 'card'; cardId: string; kind: 'preventiu' | 'ticket'; title: string; minutes: number; meta?: string; machine?: string }
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
        meta: target.meta,
        sourceId: target.sourceId,
      })
        return
      }

      if (scheduledItems.some((i) => i.sourceId === payload.cardId)) return
      openModal({
        kind: payload.kind,
        title: payload.title,
        dayIndex,
        start: startTime,
        duration: payload.minutes,
        end: timeFromMinutes(minutesFromTime(startTime) + payload.minutes),
        workersCount: 1,
        workers: [],
        priority: 'normal',
        location: payload.meta || '',
        machine: payload.machine || '',
        meta: payload.meta,
        sourceId: payload.cardId,
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
        meta: item.meta,
        sourceId: item.sourceId,
      })
  }

  const handleCreateEmpty = (dayIndex: number, startTime: string) => {
      openModal({
        kind: tab === 'preventius' ? 'preventiu' : 'ticket',
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
                  (visibleItems as MockTask[]).map((t) => {
                    const alreadyPlanned = scheduledItems.some((i) => i.sourceId === t.id)
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
                              cardId: t.id,
                              kind: 'preventiu',
                              title: t.title,
                              minutes: t.minutes,
                              meta: t.asset,
                            })
                          )
                        }}
                      >
                        <div className="font-semibold text-gray-900 leading-snug">{t.title}</div>
                        <div className="text-[10px] text-gray-600">{t.asset}</div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-600">
                          <span>{t.minutes} min</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">Permesos</span>
                        </div>
                      </div>
                    )
                  })}
                {tab === 'tickets' &&
                  (visibleItems as MockTicket[]).map((t) => {
                    const alreadyPlanned = scheduledItems.some((i) => i.sourceId === t.id)
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
                              cardId: t.id,
                              kind: 'ticket',
                              title: `${t.code} - ${t.title}`,
                              minutes: t.minutes,
                              meta: t.location || '',
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
                    onClick={() => {
                      setScheduledItems((prev) => prev.filter((i) => i.id !== draft.id))
                      setIsModalOpen(false)
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
                      if (!draft.title) return
                      if (!draft.start || !draft.end) return
                      const id =
                        draft.id || `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
                      const nextItem: ScheduledItem = {
                        id,
                        kind: draft.kind,
                        title: draft.title,
                        workers: draft.workers,
                        workersCount: draft.workersCount,
                        dayIndex: draft.dayIndex,
                        start: draft.start,
                        end: draft.end,
                        minutes: draft.duration,
                        meta: draft.meta,
                        priority: draft.priority,
                        location: draft.location,
                        machine: draft.machine,
                        sourceId: draft.sourceId,
                      }
                      setScheduledItems((prev) => {
                        const next = prev.filter((i) => {
                          if (i.id === id) return false
                          if (draft.sourceId) return i.sourceId !== draft.sourceId
                          return true
                        })
                        return [...next, nextItem]
                      })
                      if (draft.kind === 'ticket' && draft.sourceId) {
                        await persistTicketPlanning(nextItem)
                      }
                      setIsModalOpen(false)
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
