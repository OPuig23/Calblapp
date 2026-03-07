'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { phaseLabel, statusLabel, type ProjectData } from './project-shared'
import { type WorkspaceTab, workspaceTabs } from './project-workspace-helpers'

type Props = {
  project: ProjectData
  activeTab: WorkspaceTab
  onTabChange: (tab: WorkspaceTab) => void
}

export default function ProjectWorkspaceShell({
  project,
  activeTab,
  onTabChange,
}: Props) {
  const stats = [
    { label: 'Departaments', value: String(project.departments.length) },
    { label: 'Blocs', value: String(project.blocks.length) },
    { label: 'Kickoff', value: project.kickoff.status ? 'Programat' : 'Pendent' },
  ]

  return (
    <section className="overflow-hidden rounded-[28px] border border-violet-200 bg-white shadow-sm">
      <div className="border-b border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 px-6 py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {project.name || 'Projecte sense nom'}
              </h1>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {statusLabel(project.status)}
              </span>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                {phaseLabel(project.phase)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>Responsable: {project.owner || 'Sense assignar'}</span>
              <span>Impulsor: {project.sponsor || 'Sense assignar'}</span>
              <span>Arrencada: {project.launchDate || 'Sense data'}</span>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-3 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/90 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <Tabs value={activeTab}>
          <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0">
            {workspaceTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                    isActive
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>
    </section>
  )
}
