'use client'

import { ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2 } from 'lucide-react'
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
import { BLOCK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, type ProjectBlock, type ProjectData } from './project-shared'
import { priorityBadgeClass, type ResponsibleOption } from './project-workspace-helpers'

type BlockDraft = {
  name: string
  summary: string
  department: string
  owner: string
  deadline: string
  dependsOn: string
  status: string
}

type TaskDraft = {
  blockId: string
  title: string
  owner: string
  deadline: string
  dependsOn: string
  priority: string
  status: string
}

type Props = {
  project: ProjectData
  blockDraft: BlockDraft
  taskDraft: TaskDraft
  showBlockComposer: boolean
  editingBlockId: string | null
  expandedBlocks: string[]
  quickTaskBlockId: string | null
  savingBlocks: boolean
  onSave: () => void
  onResetBlockDraft: () => void
  onSetBlockDraft: (updater: (current: BlockDraft) => BlockDraft) => void
  onCreateBlock: () => void
  onSetBlockField: <K extends keyof ProjectBlock>(blockId: string, field: K, value: ProjectBlock[K]) => void
  onToggleBlockExpanded: (blockId: string) => void
  onRemoveBlock: (blockId: string) => void
  onSetEditingBlockId: (value: string | null | ((current: string | null) => string | null)) => void
  onOpenQuickTaskComposer: (blockId: string) => void
  onResetTaskDraft: () => void
  onSetTaskDraftField: <K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) => void
  onAddTaskToBlock: (blockId: string) => void
  onRemoveTask: (blockId: string, taskId: string) => void
  departmentResponsibleOptions: (department?: string) => ResponsibleOption[]
  taskResponsibleOptions: (department?: string) => ResponsibleOption[]
}

export default function ProjectBlocksTab({
  project,
  blockDraft,
  taskDraft,
  showBlockComposer,
  editingBlockId,
  expandedBlocks,
  quickTaskBlockId,
  savingBlocks,
  onSave,
  onResetBlockDraft,
  onSetBlockDraft,
  onCreateBlock,
  onSetBlockField,
  onToggleBlockExpanded,
  onRemoveBlock,
  onSetEditingBlockId,
  onOpenQuickTaskComposer,
  onResetTaskDraft,
  onSetTaskDraftField,
  onAddTaskToBlock,
  onRemoveTask,
  departmentResponsibleOptions,
  taskResponsibleOptions,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Blocs</h2>
            <p className="text-sm text-slate-500">Fronts de treball del projecte.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={savingBlocks}
              className="border-violet-200 text-violet-700 hover:bg-violet-50"
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
            {showBlockComposer ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onResetBlockDraft}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {showBlockComposer ? (
          <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-[260px_minmax(0,1fr)_220px_200px_220px]">
            <div className="space-y-2">
              <Label>Nom del bloc</Label>
              <Input
                value={blockDraft.name}
                onChange={(event) =>
                  onSetBlockDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex: Pla d obra"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcio breu</Label>
              <Input
                value={blockDraft.summary}
                onChange={(event) =>
                  onSetBlockDraft((current) => ({ ...current, summary: event.target.value }))
                }
                placeholder="Descripcio breu"
              />
            </div>
            <div className="space-y-2">
              <Label>Departament</Label>
              <Select
                value={blockDraft.department || undefined}
                onValueChange={(value) =>
                  onSetBlockDraft((current) => ({ ...current, department: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona departament" />
                </SelectTrigger>
                <SelectContent>
                  {project.departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                value={blockDraft.owner || undefined}
                onValueChange={(value) =>
                  onSetBlockDraft((current) => ({ ...current, owner: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona responsable" />
                </SelectTrigger>
                <SelectContent>
                  {departmentResponsibleOptions(blockDraft.department).map((option) => (
                    <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data objectiu</Label>
              <Input
                type="date"
                value={blockDraft.deadline}
                onChange={(event) =>
                  onSetBlockDraft((current) => ({ ...current, deadline: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label>Depen de</Label>
              <Select
                value={blockDraft.dependsOn}
                onValueChange={(value) =>
                  onSetBlockDraft((current) => ({ ...current, dependsOn: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cap</SelectItem>
                  {project.blocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={onCreateBlock}>
                Afegir
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          {project.blocks.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-sm text-slate-500">
              Encara no hi ha blocs. Crea el primer front de treball del projecte.
            </div>
          ) : (
            project.blocks.map((block) => (
              <div key={block.id} className="space-y-4 rounded-[24px] border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-slate-900">
                        {block.name || 'Bloc sense nom'}
                      </div>
                      {block.summary ? (
                        <div className="text-sm text-slate-500">{block.summary}</div>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>{block.department || 'Sense departament'}</span>
                      <span>·</span>
                      <span>{block.owner || 'Sense responsable'}</span>
                      <span>·</span>
                      <span>{block.deadline || 'Sense data'}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          block.status === 'done'
                            ? 'bg-emerald-100 text-emerald-700'
                            : block.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : block.status === 'blocked'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {BLOCK_STATUS_OPTIONS.find((option) => option.value === block.status)?.label || 'Pendent'}
                      </span>
                    </div>
                    {block.dependsOn ? (
                      <div className="mt-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                          Depen de:{' '}
                          {project.blocks.find((item) => item.id === block.dependsOn)?.name || 'Bloc anterior'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() =>
                        onSetEditingBlockId((current) => (current === block.id ? null : block.id))
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => onToggleBlockExpanded(block.id)}
                    >
                      {expandedBlocks.includes(block.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onRemoveBlock(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {editingBlockId === block.id ? (
                  <>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={block.name}
                        onChange={(event) => onSetBlockField(block.id, 'name', event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripcio</Label>
                      <Textarea
                        value={block.summary}
                        onChange={(event) => onSetBlockField(block.id, 'summary', event.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Departament</Label>
                        <Select
                          value={block.department || 'none'}
                          onValueChange={(value) =>
                            onSetBlockField(block.id, 'department', value === 'none' ? '' : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sense departament</SelectItem>
                            {project.departments.map((department) => (
                              <SelectItem key={department} value={department}>
                                {department}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Responsable</Label>
                        <Select
                          value={block.owner || 'none'}
                          onValueChange={(value) =>
                            onSetBlockField(block.id, 'owner', value === 'none' ? '' : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sense responsable</SelectItem>
                            {departmentResponsibleOptions(block.department).map((option) => (
                              <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data objectiu</Label>
                        <Input
                          type="date"
                          value={block.deadline}
                          onChange={(event) => onSetBlockField(block.id, 'deadline', event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estat</Label>
                        <Select
                          value={block.status}
                          onValueChange={(value) => onSetBlockField(block.id, 'status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOCK_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      {block.tasks.length} tasques. Gestiona-les des de la pestanya Tasques.
                    </div>
                  </>
                ) : null}

                {expandedBlocks.includes(block.id) && editingBlockId !== block.id ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">Tasques del bloc</div>
                      {quickTaskBlockId === block.id ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={onResetTaskDraft}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => onOpenQuickTaskComposer(block.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {quickTaskBlockId === block.id ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.6fr)_220px_170px_160px_150px_auto]">
                        <Input
                          value={taskDraft.title}
                          onChange={(event) => onSetTaskDraftField('title', event.target.value)}
                          placeholder="Nova tasca"
                        />
                        <Select
                          value={taskDraft.owner || 'none'}
                          onValueChange={(value) => onSetTaskDraftField('owner', value === 'none' ? '' : value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sense responsable</SelectItem>
                            {taskResponsibleOptions(block.department).map((option) => (
                              <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="date"
                          value={taskDraft.deadline}
                          onChange={(event) => onSetTaskDraftField('deadline', event.target.value)}
                        />
                        <Select
                          value={taskDraft.priority}
                          onValueChange={(value) => onSetTaskDraftField('priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_PRIORITY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={taskDraft.status}
                          onValueChange={(value) => onSetTaskDraftField('status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={() => onAddTaskToBlock(block.id)}>
                          Afegir
                        </Button>
                      </div>
                    ) : null}

                    {block.tasks.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                        Encara no hi ha tasques en aquest bloc.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {block.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">{task.title}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                                  {TASK_PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label || 'Normal'}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label || 'Pendent'}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <span>{task.owner || 'Sense responsable'}</span>
                                <span>·</span>
                                <span>{task.deadline || 'Sense data'}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => onRemoveTask(block.id, task.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
