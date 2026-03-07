'use client'

import { phaseLabel, statusLabel, type ProjectData } from './project-shared'

type Props = {
  project: ProjectData
}

export default function ProjectTrackingTab({ project }: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-500">Fase actual</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">{phaseLabel(project.phase)}</div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-500">Estat</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">{statusLabel(project.status)}</div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-500">Blocs oberts</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">
          {project.blocks.filter((block) => block.status !== 'done').length}
        </div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-500">Kickoff</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">
          {project.kickoff.status ? 'Programat' : 'Pendent'}
        </div>
      </div>
    </div>
  )
}
