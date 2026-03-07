'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, FolderKanban, UserRound } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { RoleGuard } from '@/lib/withRoleGuard'
import { statusLabel } from './components/project-shared'

type ProjectListItem = {
  id: string
  name?: string
  owner?: string
  status?: string
  launchDate?: string
  departments?: string[]
  blocks?: Array<{ id?: string }>
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex w-full max-w-none flex-col gap-6 p-4">
        <ModuleHeader title="Projects" subtitle="Projectes corporatius" />

        <section className="rounded-[28px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-400">Projectes</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{projects.length}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-400">Kickoff</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {projects.filter((project) => project.status === 'kickoff').length}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-400">En marxa</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {
                    projects.filter((project) =>
                      ['planning', 'execution', 'control'].includes(project.status || '')
                    ).length
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Carregant projectes...
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Projectes</h2>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Encara no hi ha projectes.
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/menu/projects/${project.id}`}
                    className="block rounded-[24px] border border-slate-200 px-5 py-4 transition hover:border-violet-300 hover:bg-violet-50/30"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-2">
                        <div className="text-base font-semibold text-slate-900">
                          {project.name || 'Projecte sense nom'}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <UserRound className="h-4 w-4" />
                            {project.owner || 'Sense responsable'}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {project.launchDate || 'Sense data d arrencada'}
                          </span>
                          <span>{project.departments?.length || 0} departaments</span>
                          <span>{project.blocks?.length || 0} blocs</span>
                        </div>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {statusLabel(project.status)}
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
