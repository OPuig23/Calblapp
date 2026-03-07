'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import ProjectWorkspace from '../components/ProjectWorkspace'
import { EMPTY_KICKOFF, type ProjectData } from '../components/project-shared'

type ProjectResponse = {
  id: string
  name?: string
  sponsor?: string
  owner?: string
  context?: string
  strategy?: string
  risks?: string
  startDate?: string
  launchDate?: string
  budget?: string
  phase?: string
  status?: string
  departments?: string[]
  blocks?: ProjectData['blocks']
  document?: ProjectData['document']
  kickoff?: Partial<ProjectData['kickoff']> | null
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const id = params?.id
        if (!id) throw new Error('Projecte no trobat')

        const res = await fetch(`/api/projects/${id}`, { cache: 'no-store' })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error || 'No s ha pogut carregar el projecte')
        }

        const data = (await res.json()) as ProjectResponse
        if (cancelled) return

        setProject({
          id: data.id,
          name: data.name || '',
          sponsor: data.sponsor || '',
          owner: data.owner || '',
          context: data.context || '',
          strategy: data.strategy || '',
          risks: data.risks || '',
          startDate: data.startDate || '',
          launchDate: data.launchDate || '',
          budget: data.budget || '',
          phase: data.phase || 'initial',
          status: data.status || 'draft',
          departments: Array.isArray(data.departments) ? data.departments : [],
          blocks: Array.isArray(data.blocks)
            ? data.blocks.map((block) => ({
                id: block.id || `block-${Date.now()}`,
                name: block.name || '',
                summary: block.summary || '',
                department: block.department || '',
                owner: block.owner || '',
                deadline: block.deadline || '',
                dependsOn: block.dependsOn || '',
                status: block.status || 'pending',
                tasks: Array.isArray((block as { tasks?: ProjectData['blocks'][number]['tasks'] }).tasks)
                    ? ((block as { tasks?: ProjectData['blocks'][number]['tasks'] }).tasks || []).map((task) => ({
                      id: task.id || `task-${Date.now()}`,
                      title: task.title || '',
                      owner: task.owner || '',
                      deadline: task.deadline || '',
                      dependsOn: task.dependsOn || '',
                      priority: task.priority || 'normal',
                      status: task.status || 'pending',
                    }))
                  : [],
              }))
            : [],
          document: data.document || null,
          kickoff: {
            ...EMPTY_KICKOFF,
            ...(data.kickoff || {}),
            attendees: Array.isArray(data.kickoff?.attendees)
              ? data.kickoff!.attendees!.map((item) => ({
                  key: item.key || '',
                  department: item.department || '',
                  userId: item.userId || '',
                  name: item.name || '',
                  email: item.email || '',
                }))
              : [],
            excludedKeys: Array.isArray(data.kickoff?.excludedKeys)
              ? data.kickoff!.excludedKeys!.map(String)
              : [],
          },
        })
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error carregant el projecte')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params])

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="flex w-full max-w-none flex-col gap-6 p-4">
        <ModuleHeader
          title="Projects"
          subtitle={project?.name || 'Projecte'}
          mainHref="/menu/projects"
        />

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!project && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            Carregant projecte...
          </div>
        ) : null}

        {project ? <ProjectWorkspace projectId={params.id} initialProject={project} /> : null}
      </div>
    </RoleGuard>
  )
}
