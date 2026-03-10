'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { CalendarDays, FolderKanban, Search, UserRound } from 'lucide-react'
import SmartFilters, { type SmartFiltersChange } from '@/components/filters/SmartFilters'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { Input } from '@/components/ui/input'
import { RoleGuard } from '@/lib/withRoleGuard'
import { formatProjectDate, phaseLabel } from './components/project-shared'

type ProjectListItem = {
  id: string
  name?: string
  owner?: string
  phase?: string
  status?: string
  createdAt?: string | number
  launchDate?: string
  departments?: string[]
  blocks?: Array<{ id?: string }>
}

type ProjectNotification = {
  id: string
  title?: string
  body?: string
  type?: string
  read?: boolean
  projectId?: string
  projectName?: string
  blockId?: string
  blockName?: string
  taskId?: string
  taskName?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<SmartFiltersChange>({})
  const { data: notificationsData, mutate: mutateNotifications } = useSWR(
    '/api/notifications?mode=list',
    fetcher
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/projects', { cache: 'no-store' })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || 'No s han pogut carregar els projectes')
        }

        const data = (await res.json()) as { projects?: ProjectListItem[] }
        if (cancelled) return

        setProjects(Array.isArray(data.projects) ? data.projects : [])
        setError('')
      } catch (err: unknown) {
        if (!cancelled) {
          setProjects([])
          setError(err instanceof Error ? err.message : 'Error carregant projectes')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    const unreadProjectNotifications = (
      Array.isArray(notificationsData?.notifications) ? notificationsData.notifications : []
    ).filter(
      (notification: ProjectNotification) =>
        !notification.read &&
        ['project_assignment', 'project_block_assignment', 'project_task_assignment'].includes(
          String(notification.type || '')
        )
    )

    if (unreadProjectNotifications.length === 0) return

    ;(async () => {
      for (const type of ['project_assignment', 'project_block_assignment', 'project_task_assignment']) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markAllRead', type }),
        })
      }
      await mutateNotifications()
    })()
  }, [mutateNotifications, notificationsData])

  const normalizeText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const projectDurationDays = (createdAt?: string | number, launchDate?: string) => {
    const createdValue =
      typeof createdAt === 'number'
        ? new Date(createdAt)
        : String(createdAt || '').trim()
          ? new Date(String(createdAt))
          : null
    const launchValue = String(launchDate || '').trim()
      ? new Date(`${String(launchDate).trim()}T00:00:00`)
      : null

    if (
      !createdValue ||
      Number.isNaN(createdValue.getTime()) ||
      !launchValue ||
      Number.isNaN(launchValue.getTime())
    ) {
      return null
    }

    const start = new Date(createdValue.getFullYear(), createdValue.getMonth(), createdValue.getDate())
    const end = new Date(launchValue.getFullYear(), launchValue.getMonth(), launchValue.getDate())
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
    return diff >= 0 ? diff : null
  }

  const filteredProjects = useMemo(() => {
    const queryTokens = normalizeText(searchQuery)
      .split(/\s+/)
      .filter(Boolean)

    return projects.filter((project) => {
      const launchDate = String(project.launchDate || '').trim()

      const haystack = normalizeText(
        [
          project.name,
          project.owner,
          ...(project.departments || []),
          formatProjectDate(launchDate),
        ]
          .filter(Boolean)
          .join(' ')
      )

      const matchesQuery =
        queryTokens.length === 0 || queryTokens.every((token) => haystack.includes(token))
      const matchesMonth =
        !dateFilter.start ||
        !dateFilter.end ||
        !launchDate ||
        (launchDate >= dateFilter.start && launchDate <= dateFilter.end)

      return matchesQuery && matchesMonth
    })
  }, [projects, searchQuery, dateFilter.start, dateFilter.end])
  const projectNotifications = useMemo(
    () =>
      (Array.isArray(notificationsData?.notifications) ? notificationsData.notifications : []).filter(
        (notification: ProjectNotification) =>
          !notification.read &&
          [
            'project_assignment',
            'project_block_assignment',
            'project_task_assignment',
          ].includes(String(notification.type || ''))
      ),
    [notificationsData]
  )
  const openProjectNotification = (notification: ProjectNotification) => {
    const projectId = String(notification.projectId || '').trim()
    if (!projectId) return

    if (notification.type === 'project_task_assignment') {
      router.push(`/menu/projects/${projectId}?tab=tasks`)
      return
    }

    if (notification.type === 'project_block_assignment') {
      router.push(`/menu/projects/${projectId}?tab=blocks`)
      return
    }

    router.push(`/menu/projects/${projectId}`)
  }
  const extractNotificationLabel = (notification: ProjectNotification) => {
    const body = String(notification.body || '')

    if (notification.type === 'project_task_assignment') {
      const taskName =
        String(notification.taskName || '').trim() ||
        body.match(/tasca\s+(.+?)\s+del bloc/i)?.[1]?.trim() ||
        'Tasca'
      const blockName =
        String(notification.blockName || '').trim() ||
        body.match(/bloc\s+(.+)$/i)?.[1]?.trim() ||
        ''
      return { primary: taskName, secondary: blockName, prefix: 'Tasca' }
    }

    if (notification.type === 'project_block_assignment') {
      const blockName =
        String(notification.blockName || '').trim() ||
        body.match(/bloc\s+(.+?)\s+del projecte/i)?.[1]?.trim() ||
        'Bloc'
      const projectName =
        String(notification.projectName || '').trim() ||
        body.match(/projecte\s+(.+)$/i)?.[1]?.trim() ||
        ''
      return { primary: blockName, secondary: projectName, prefix: 'Bloc' }
    }

    const projectName =
      String(notification.projectName || '').trim() ||
      body.split('projecte:').pop()?.trim() ||
      'Projecte'
    return { primary: projectName, secondary: '', prefix: 'Projecte' }
  }

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex w-full max-w-none flex-col gap-6 p-4">
        <ModuleHeader title="Projects" subtitle="Projectes corporatius" />

        <section className="rounded-[28px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
              <FolderKanban className="h-4 w-4" />
              Coordinacio de nous projectes
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Hub de governanca per definir, activar i coordinar projectes corporatius.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        {projectNotifications.length > 0 ? (
          <section className="rounded-[14px] border border-violet-200/80 bg-white px-2.5 py-2 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                Avisos de Projects
              </div>
              <div className="text-xs text-slate-500">
                {projectNotifications.length} recents
              </div>
            </div>
            <div className="space-y-1">
              {projectNotifications.slice(0, 6).map((notification: ProjectNotification) => {
                const label = extractNotificationLabel(notification)
                return (
                <div
                  key={notification.id}
                  className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 text-sm"
                >
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                    {label.prefix}
                  </span>
                  <div className="min-w-0 flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-700">
                    <button
                      type="button"
                      className="truncate font-medium text-slate-900 hover:text-violet-700 hover:underline"
                      onClick={() => openProjectNotification(notification)}
                    >
                      {label.primary}
                    </button>
                    {label.secondary ? <span className="text-slate-400">·</span> : null}
                    {label.secondary ? (
                      <span className="truncate text-slate-500">{label.secondary}</span>
                    ) : (
                      <span className="text-slate-400">{notification.title || ''}</span>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Carregant projectes...
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[minmax(320px,520px)_auto]">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar projecte..."
                  className="h-10 rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400"
                />
              </div>

              <div className="flex items-center justify-start md:justify-end">
                <SmartFilters
                  modeDefault="month"
                  modeOptions={['month']}
                  role="Admin"
                  showDepartment={false}
                  showWorker={false}
                  showLocation={false}
                  showStatus={false}
                  showAdvanced={false}
                  compact
                  onChange={setDateFilter}
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-8 text-sm text-slate-500">
                {projects.length === 0 ? 'Encara no hi ha projectes.' : 'Cap projecte coincideix amb els filtres.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/menu/projects/${project.id}`}
                    className="block rounded-[24px] bg-slate-50/70 px-5 py-4 transition hover:bg-violet-50/40"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-2">
                        <div className="text-base font-semibold text-slate-900">
                          {project.name || 'Projecte sense nom'}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4" />
                            {project.owner || 'Sense responsable'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Creat: {project.createdAt ? formatProjectDate(project.createdAt) : 'Sense data'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {project.launchDate
                              ? formatProjectDate(project.launchDate)
                              : 'Sense data d arrencada'}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {projectDurationDays(project.createdAt, project.launchDate) !== null
                              ? `${projectDurationDays(project.createdAt, project.launchDate)} dies`
                              : 'Sense durada'}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {project.departments?.length || 0} departaments
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                            {project.blocks?.length || 0} blocs
                          </span>
                        </div>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {phaseLabel(project.phase)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <FloatingAddButton onClick={() => router.push('/menu/projects/new')} />
    </RoleGuard>
  )
}
