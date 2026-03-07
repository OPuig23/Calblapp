'use client'

import Link from 'next/link'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  PROJECT_DEPARTMENTS,
  PROJECT_PHASE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  type ProjectData,
} from './project-shared'
import { type ResponsibleOption } from './project-workspace-helpers'

type Props = {
  project: ProjectData
  ownerOptions: ResponsibleOption[]
  pendingFile: File | null
  savingOverview: boolean
  onSave: () => void
  onToggleDepartment: (department: string) => void
  onProjectChange: (updater: (current: ProjectData) => ProjectData) => void
  onPendingFileChange: (file: File | null) => void
}

export default function ProjectOverviewTab({
  project,
  ownerOptions,
  pendingFile,
  savingOverview,
  onSave,
  onToggleDepartment,
  onProjectChange,
  onPendingFileChange,
}: Props) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
      <section className="space-y-5 rounded-[24px] border border-violet-200 bg-violet-50/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <p className="text-sm text-slate-500">Base del projecte, responsables i abast.</p>
          </div>
          <Button
            type="button"
            onClick={onSave}
            disabled={savingOverview}
            className="shrink-0 bg-violet-600 hover:bg-violet-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar canvis
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Nom del projecte</Label>
          <Input
            value={project.name}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, name: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Responsable impulsor</Label>
            <Input
              value={project.sponsor}
              onChange={(event) =>
                onProjectChange((current) => ({ ...current, sponsor: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Responsable del projecte</Label>
            <Select
              value={project.owner || undefined}
              onValueChange={(value) => onProjectChange((current) => ({ ...current, owner: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona responsable" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((option) => (
                  <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Definicio del projecte</Label>
          <Textarea
            value={project.context}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, context: event.target.value }))
            }
            className="min-h-[160px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Objectius estrategics</Label>
          <Textarea
            value={project.strategy}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, strategy: event.target.value }))
            }
            className="min-h-[130px]"
          />
        </div>
      </section>

      <div className="space-y-5">
        <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Governanca</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select
                value={project.phase || 'initial'}
                onValueChange={(value) => onProjectChange((current) => ({ ...current, phase: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_PHASE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estat</Label>
              <Select
                value={project.status || 'draft'}
                onValueChange={(value) => onProjectChange((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Data inici prevista</Label>
              <Input
                type="date"
                value={project.startDate}
                onChange={(event) =>
                  onProjectChange((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Data objectiu d arrencada</Label>
              <Input
                type="date"
                value={project.launchDate}
                onChange={(event) =>
                  onProjectChange((current) => ({ ...current, launchDate: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pressupost orientatiu</Label>
            <Input
              value={project.budget}
              onChange={(event) =>
                onProjectChange((current) => ({ ...current, budget: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Riscos identificats</Label>
            <Textarea
              value={project.risks}
              onChange={(event) =>
                onProjectChange((current) => ({ ...current, risks: event.target.value }))
              }
              className="min-h-[120px]"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Departaments implicats</h2>
          <div className="flex flex-wrap gap-2">
            {PROJECT_DEPARTMENTS.map((department) => {
              const selected = project.departments.includes(department)
              return (
                <button
                  key={department}
                  type="button"
                  onClick={() => onToggleDepartment(department)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? 'border-violet-300 bg-violet-100 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {department}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Document inicial</h2>
          {project.document?.url ? (
            <Link
              href={project.document.url}
              target="_blank"
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50/40"
            >
              <span>{project.document.name || 'Document del projecte'}</span>
              <span className="text-violet-700">Obrir</span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
              Encara no hi ha document adjunt.
            </div>
          )}
          <Input
            type="file"
            onChange={(event) => onPendingFileChange(event.target.files?.[0] || null)}
          />
          {pendingFile ? <div className="text-xs text-slate-500">{pendingFile.name}</div> : null}
        </section>
      </div>
    </div>
  )
}
