'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Filter, Milestone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { colorByDepartment } from '@/lib/colors'
import {
  formatProjectDate,
  getBlockDepartments,
  type ProjectData,
} from './project-shared'
import {
  projectEmptyStateClass,
  projectSectionSubtitleClass,
  projectSectionTitleClass,
} from './project-ui'

type Props = {
  projectId: string
  project: ProjectData
}

type TimelineItem = {
  id: string
  kind: 'milestone' | 'block' | 'task'
  title: string
  blockName?: string
  department?: string
  owner?: string
  status?: string
  priority?: string
  date?: string
  start?: string
  end?: string
  href?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const parseDate = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toKey = (value: Date) => value.toISOString().slice(0, 10)

const addDays = (value: Date, amount: number) => {
  const next = new Date(value)
  next.setDate(next.getDate() + amount)
  return next
}

const diffDays = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / DAY_MS)

const startOfWeek = (value: Date) => {
  const next = new Date(value)
  const day = next.getDay()
  const shift = day === 0 ? 6 : day - 1
  next.setDate(next.getDate() - shift)
  next.setHours(0, 0, 0, 0)
  return next
}

const endOfWeek = (value: Date) => addDays(startOfWeek(value), 6)

const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1)

const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0)

const monthLabel = (value: Date) =>
  value.toLocaleDateString('ca-ES', { month: 'short', day: '2-digit' })

const dayLabel = (value: Date) =>
  value.toLocaleDateString('ca-ES', { weekday: 'short', day: '2-digit' })

const itemTone = (status?: string) => {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'blocked') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200'
  if (status === 'overdue') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function ProjectPlanningTab({ projectId, project }: Props) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month')
  const [entityFilter, setEntityFilter] = useState<'all' | 'milestones' | 'blocks' | 'tasks'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [anchorDate, setAnchorDate] = useState<Date>(() => parseDate(project.launchDate) || new Date())

  const milestoneItems = useMemo<TimelineItem[]>(
    () =>
      [
        project.startDate
          ? {
              id: 'milestone-start',
              kind: 'milestone',
              title: 'Inici projecte',
              date: project.startDate,
              status: 'done',
              href: `/menu/projects/${projectId}?tab=overview`,
            }
          : null,
        project.kickoff?.date
          ? {
              id: 'milestone-kickoff',
              kind: 'milestone',
              title: 'Kickoff',
              date: project.kickoff.date,
              status: project.kickoff.status || 'in_progress',
              href: `/menu/projects/${projectId}?tab=kickoff`,
            }
          : null,
        project.launchDate
          ? {
              id: 'milestone-launch',
              kind: 'milestone',
              title: 'Arrencada',
              date: project.launchDate,
              status: project.phase === 'closed' ? 'done' : 'in_progress',
              href: `/menu/projects/${projectId}?tab=overview`,
            }
          : null,
      ].filter(Boolean) as TimelineItem[],
    [project, projectId]
  )

  const blockItems = useMemo<TimelineItem[]>(
    () =>
      project.blocks.map((block) => ({
        id: `block-${block.id}`,
        kind: 'block',
        title: block.name || 'Bloc',
        department: getBlockDepartments(block)[0] || '',
        owner: block.owner || '',
        status: block.status || 'pending',
        start: project.startDate || project.kickoff?.date || '',
        end: block.deadline || project.launchDate || '',
        href: `/menu/projects/${projectId}?tab=blocks`,
      })),
    [project, projectId]
  )

  const taskItems = useMemo<TimelineItem[]>(
    () =>
      project.blocks.flatMap((block) =>
        (block.tasks || []).map((task) => ({
          id: `task-${task.id}`,
          kind: 'task',
          title: task.title || 'Tasca',
          blockName: block.name || 'Bloc',
          department: task.department || getBlockDepartments(block)[0] || '',
          owner: task.owner || '',
          status: task.status || 'pending',
          priority: task.priority || 'normal',
          date: task.deadline || '',
          href: `/menu/projects/${projectId}?tab=tasks`,
        }))
      ),
    [project, projectId]
  )

  const allItems = useMemo(
    () => [...milestoneItems, ...blockItems, ...taskItems],
    [blockItems, milestoneItems, taskItems]
  )

  const timelineBounds = useMemo(() => {
    const dates = allItems.flatMap((item) => [
      parseDate(item.start),
      parseDate(item.end),
      parseDate(item.date),
    ]).filter(Boolean) as Date[]

    if (dates.length === 0) {
      const today = new Date()
      return {
        min: startOfWeek(today),
        max: endOfWeek(today),
      }
    }

    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
    return {
      min: addDays(sorted[0], -3),
      max: addDays(sorted[sorted.length - 1], 3),
    }
  }, [allItems])

  const visibleRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(anchorDate),
        end: endOfWeek(anchorDate),
      }
    }
    return {
      start: startOfMonth(anchorDate),
      end: endOfMonth(anchorDate),
    }
  }, [anchorDate, viewMode])

  const days = useMemo(() => {
    const total = diffDays(visibleRange.start, visibleRange.end)
    return Array.from({ length: total + 1 }, (_, index) => addDays(visibleRange.start, index))
  }, [visibleRange])

  const departments = useMemo(
    () =>
      [...new Set(project.blocks.flatMap((block) => getBlockDepartments(block)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [project.blocks]
  )

  const owners = useMemo(
    () =>
      [...new Set(allItems.map((item) => item.owner || '').filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [allItems]
  )

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (entityFilter !== 'all') {
        if (entityFilter === 'milestones' && item.kind !== 'milestone') return false
        if (entityFilter === 'blocks' && item.kind !== 'block') return false
        if (entityFilter === 'tasks' && item.kind !== 'task') return false
      }

      if (departmentFilter !== 'all' && item.department !== departmentFilter) return false
      if (ownerFilter !== 'all' && (item.owner || '') !== ownerFilter) return false
      if (statusFilter !== 'all' && (item.status || 'pending') !== statusFilter) return false

      const itemStart = parseDate(item.start) || parseDate(item.date) || parseDate(item.end)
      const itemEnd = parseDate(item.end) || itemStart
      if (!itemStart || !itemEnd) return false

      return itemEnd >= visibleRange.start && itemStart <= visibleRange.end
    })
  }, [allItems, departmentFilter, entityFilter, ownerFilter, statusFilter, visibleRange])

  const todayOffset = useMemo(() => {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const offset = diffDays(visibleRange.start, todayStart)
    return offset >= 0 && offset < days.length ? offset : null
  }, [days.length, visibleRange.start])

  const moveAnchor = (direction: -1 | 1) => {
    setAnchorDate((current) => {
      const next = new Date(current)
      if (viewMode === 'week') next.setDate(next.getDate() + direction * 7)
      else next.setMonth(next.getMonth() + direction)
      return next
    })
  }

  const rangeLabel =
    viewMode === 'week'
      ? `${formatProjectDate(toKey(visibleRange.start))} - ${formatProjectDate(toKey(visibleRange.end))}`
      : visibleRange.start.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] bg-white/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className={projectSectionTitleClass}>Planning</h2>
            <p className={projectSectionSubtitleClass}>
              Vista temporal de fites, blocs i tasques del projecte.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => moveAnchor(-1)}>
              Anterior
            </Button>
            <div className="min-w-[220px] text-center text-sm font-medium text-slate-700">{rangeLabel}</div>
            <Button type="button" variant="outline" onClick={() => moveAnchor(1)}>
              Seguent
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAnchorDate(new Date())}>
              Avui
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[130px_160px_180px_180px_160px]">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
            <SelectTrigger>
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Setmana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as typeof entityFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Elements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tot</SelectItem>
              <SelectItem value="milestones">Fites</SelectItem>
              <SelectItem value="blocks">Blocs</SelectItem>
              <SelectItem value="tasks">Tasques</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Departament" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els departaments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={`planning-department-${department}`} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els responsables</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={`planning-owner-${owner}`} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els estats</SelectItem>
              <SelectItem value="pending">Pendent</SelectItem>
              <SelectItem value="in_progress">En curs</SelectItem>
              <SelectItem value="blocked">Bloquejada</SelectItem>
              <SelectItem value="done">Feta</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-[24px] bg-white/75 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
          {filteredItems.length} elements visibles
        </div>

        {filteredItems.length === 0 ? (
          <div className={`rounded-2xl bg-slate-50/80 px-6 py-10 ${projectEmptyStateClass}`}>
            No hi ha elements en aquest rang i filtres.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div
                className="grid border-b border-slate-200 pb-3"
                style={{ gridTemplateColumns: `260px repeat(${days.length}, minmax(40px, 1fr))` }}
              >
                <div className="pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Elements
                </div>
                {days.map((day) => (
                  <div
                    key={`planning-day-${toKey(day)}`}
                    className="text-center text-[11px] font-medium text-slate-500"
                  >
                    {viewMode === 'week' ? dayLabel(day) : monthLabel(day)}
                  </div>
                ))}
              </div>

              <div className="relative">
                {todayOffset !== null ? (
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-violet-300/80"
                    style={{
                      left: `calc(260px + ((100% - 260px) / ${days.length}) * ${todayOffset + 0.5})`,
                    }}
                  />
                ) : null}

                <div className="space-y-3 pt-4">
                  {filteredItems.map((item) => {
                    const itemStart = parseDate(item.start) || parseDate(item.date) || parseDate(item.end)
                    const itemEnd = parseDate(item.end) || itemStart
                    if (!itemStart || !itemEnd) return null

                    const startOffset = Math.max(0, diffDays(visibleRange.start, itemStart))
                    const endOffset = Math.min(days.length - 1, diffDays(visibleRange.start, itemEnd))
                    const span = Math.max(1, endOffset - startOffset + 1)
                    const pillClass =
                      item.kind === 'milestone'
                        ? 'border-violet-200 bg-violet-100 text-violet-700'
                        : item.kind === 'task'
                          ? 'border-slate-200 bg-slate-100 text-slate-700'
                          : itemTone(item.status)

                    return (
                      <div
                        key={item.id}
                        className="grid items-center gap-y-2"
                        style={{ gridTemplateColumns: `260px repeat(${days.length}, minmax(40px, 1fr))` }}
                      >
                        <div className="pr-4">
                          <div className="flex items-center gap-2">
                            {item.kind === 'milestone' ? (
                              <Milestone className="h-4 w-4 text-violet-500" />
                            ) : item.kind === 'block' ? (
                              <CalendarClock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-slate-400" />
                            )}
                            {item.href ? (
                              <Link href={item.href} className="text-sm font-semibold text-slate-900 hover:text-violet-700">
                                {item.title}
                              </Link>
                            ) : (
                              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                            )}
                            {item.kind === 'task' && item.blockName ? (
                              <span className="text-xs text-slate-400">{item.blockName}</span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {item.department ? (
                              <span className={`rounded-full px-2.5 py-1 font-medium ${colorByDepartment(item.department)}`}>
                                {item.department}
                              </span>
                            ) : null}
                            {item.owner ? <span>{item.owner}</span> : null}
                          </div>
                        </div>

                        <div
                          className="col-start-2 grid h-10 items-center"
                          style={{
                            gridColumn: `${startOffset + 2} / span ${span}`,
                          }}
                        >
                          <div
                            className={`h-9 rounded-full border px-3 text-xs font-semibold ${pillClass} flex items-center justify-center truncate`}
                            title={`${item.title} · ${item.kind === 'milestone' ? formatProjectDate(item.date) : `${formatProjectDate(item.start || item.date)} - ${formatProjectDate(item.end || item.date)}`}`}
                          >
                            {item.kind === 'milestone'
                              ? formatProjectDate(item.date)
                              : item.kind === 'task'
                                ? `${item.title} · ${formatProjectDate(item.date)}`
                                : `${item.title} · ${formatProjectDate(item.end)}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
