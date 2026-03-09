'use client'

import Link from 'next/link'
import { Check, Paperclip, Plus, Save, Trash2 } from 'lucide-react'
import { colorByDepartment } from '@/lib/colors'
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
  getBlockDepartments,
  type ProjectData,
} from './project-shared'
import {
  projectCardMetaClass,
  projectEmptyStateClass,
  projectSectionSubtitleClass,
  projectSectionTitleClass,
} from './project-ui'
import { type ResponsibleOption } from './project-workspace-helpers'

type Props = {
  project: ProjectData
  availableDepartments: string[]
  ownerOptions: ResponsibleOption[]
  pendingFile: File | null
  blockDraft: {
    name: string
  }
  dirtyOverview: boolean
  savingOverview: boolean
  showBlockComposer: boolean
  onSave: () => void
  onProjectChange: (updater: (current: ProjectData) => ProjectData) => void
  onPendingFileChange: (file: File | null) => void
  onSetBlockDraftName: (value: string) => void
  onToggleBlockComposer: () => void
  onCreateBlock: () => void
  onSetBlockName: (blockId: string, value: string) => void
  onAddDepartmentToBlock: (blockId: string, department: string) => void
  onRemoveDepartmentFromBlock: (blockId: string, department: string) => void
  onRemoveBlock: (blockId: string) => void
  onRemoveDocument: (documentId: string) => void
}

export default function ProjectOverviewTab({
  project,
  availableDepartments,
  ownerOptions,
  pendingFile,
  blockDraft,
  dirtyOverview,
  savingOverview,
  showBlockComposer,
  onSave,
  onProjectChange,
  onPendingFileChange,
  onSetBlockDraftName,
  onToggleBlockComposer,
  onCreateBlock,
  onSetBlockName,
  onAddDepartmentToBlock,
  onRemoveDepartmentFromBlock,
  onRemoveBlock,
  onRemoveDocument,
}: Props) {
  const fileInputId = 'project-overview-initial-document'
  const initialDocuments = (project.documents || []).filter((item) => item && item.category === 'initial')

  return (
    <div className="grid gap-6 2xl:grid-cols-[0.95fr_0.45fr_0.6fr]">
      <section className="space-y-5 rounded-[24px] bg-violet-50/35 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={projectSectionTitleClass}>Overview</h2>
            <p className={projectSectionSubtitleClass}>Base del projecte, responsables i abast.</p>
          </div>
          <Button
            type="button"
            onClick={onSave}
            disabled={savingOverview || !dirtyOverview}
            className="shrink-0 bg-violet-600 hover:bg-violet-700"
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar canvis
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
          <div className="min-w-0 space-y-2">
            <Label>Nom del projecte</Label>
            <Input
              value={project.name}
              onChange={(event) =>
                onProjectChange((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Impulsor</Label>
            <Input value={project.sponsor} readOnly />
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Responsable projecte</Label>
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
          <div className="min-w-0 space-y-2">
            <Label>Data inici</Label>
            <Input
              type="date"
              value={project.startDate}
              onChange={(event) =>
                onProjectChange((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Data arrencada</Label>
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
        <section className="space-y-4 rounded-[24px] bg-slate-50/80 p-5">
          <h2 className={projectSectionTitleClass}>Departaments implicats</h2>
          <div className="flex flex-wrap gap-2">
            {availableDepartments.map((department) => {
              const selected = project.departments.includes(department)
              return (
                <button
                  key={department}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', department)
                  }}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? colorByDepartment(department)
                      : 'border-transparent bg-white/80 text-slate-600 hover:bg-white'
                  }`}
                >
                  {department}
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] bg-slate-50/80 p-5">
          <div className="flex items-center gap-3">
            <h2 className={projectSectionTitleClass}>Document inicial</h2>
            <label
              htmlFor={fileInputId}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
            >
              <Paperclip className="h-4 w-4" />
            </label>
          </div>

          {initialDocuments.length > 0 ? (
            <div className="space-y-2">
              {initialDocuments.map((document) => (
                <div
                  key={document?.id || document?.url || document?.name}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <Link
                    href={document?.url || '#'}
                    target="_blank"
                    className="min-w-0 flex-1 truncate hover:text-violet-700"
                  >
                    {document?.name || 'Document del projecte'}
                  </Link>
                  <div className="ml-3 flex items-center gap-3">
                    {document?.id ? (
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(document.id!)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`rounded-2xl bg-white/80 px-4 py-4 ${projectEmptyStateClass}`}>
              Encara no hi ha document adjunt.
            </div>
          )}
          <Input
            id={fileInputId}
            type="file"
            className="hidden"
            onChange={(event) => onPendingFileChange(event.target.files?.[0] || null)}
          />
          {pendingFile ? (
            <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-800">
              Arxiu seleccionat: {pendingFile.name}
            </div>
          ) : null}
        </section>
      </div>

      <section className="space-y-4 rounded-[24px] bg-slate-50/80 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className={projectSectionTitleClass}>Creacio de blocs</h2>
          {!showBlockComposer ? (
            <Button
              type="button"
              size="icon"
              onClick={onToggleBlockComposer}
              className="h-10 w-10 rounded-full bg-violet-600 hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {showBlockComposer ? (
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Label>Nom del bloc</Label>
              <Input
                value={blockDraft.name}
                onChange={(event) => onSetBlockDraftName(event.target.value)}
                placeholder="Ex: Obertura operativa"
              />
            </div>
            <Button
              type="button"
              size="icon"
              onClick={onCreateBlock}
              disabled={!blockDraft.name.trim()}
              className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="space-y-3">
          {project.blocks.length === 0 ? (
            <div className={`rounded-2xl bg-white/80 px-4 py-4 ${projectEmptyStateClass}`}>
              Encara no hi ha blocs creats.
            </div>
          ) : (
            project.blocks.map((block) => {
              const departments = getBlockDepartments(block)

              return (
                <div
                  key={block.id}
                  className="rounded-2xl bg-white/85 px-4 py-4"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const department = event.dataTransfer.getData('text/plain')
                    if (department) onAddDepartmentToBlock(block.id, department)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Input
                        value={block.name}
                        onChange={(event) => onSetBlockName(block.id, event.target.value)}
                        className="h-9 border-0 bg-transparent px-0 text-sm font-semibold text-slate-900 shadow-none focus-visible:ring-0"
                      />
                      {block.summary ? (
                      <div className={projectCardMetaClass}>{block.summary}</div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="rounded-full p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {departments.map((department) => (
                      <span
                        key={`${block.id}-${department}`}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${colorByDepartment(department)}`}
                      >
                        {department}
                        <button
                          type="button"
                          onClick={() => onRemoveDepartmentFromBlock(block.id, department)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-400">
                      Arrossega aqui departaments
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
