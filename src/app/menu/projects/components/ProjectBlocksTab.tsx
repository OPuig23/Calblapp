'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { colorByDepartment } from '@/lib/colors'
import {
  BLOCK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  formatProjectDate,
  getBlockDepartments,
  getPreLaunchDeadline,
  type ProjectBlock,
  type ProjectData,
} from './project-shared'
import {
  projectCardMetaClass,
  projectCardTitleClass,
  projectEmptyStateClass,
  projectSectionSubtitleClass,
  projectSectionTitleClass,
} from './project-ui'
import ProjectTaskQuickComposer from './ProjectTaskQuickComposer'
import { type ResponsibleOption } from './project-workspace-helpers'

type BlockDraft = {
  name: string
  summary: string
  department: string
  departments: string[]
  owner: string
  deadline: string
  budget: string
  dependsOn: string
}

type TaskDraft = {
  blockId: string
  title: string
  description: string
  department: string
  owner: string
  deadline: string
  priority: string
}

type Props = {
  projectId: string
  project: ProjectData
  availableDepartments: string[]
  blockDraft: BlockDraft
  taskDraft: TaskDraft
  showBlockComposer: boolean
  editingBlockId: string | null
  quickTaskBlockId: string | null
  savingBlocks: boolean
  dirtyBlocks: boolean
  onSave: () => void
  onResetBlockDraft: () => void
  onSetBlockDraft: (updater: (current: BlockDraft) => BlockDraft) => void
  onCreateBlock: () => void
  onSetBlockField: <K extends keyof ProjectBlock>(blockId: string, field: K, value: ProjectBlock[K]) => void
  onRemoveBlock: (blockId: string) => void
  onSetEditingBlockId: (value: string | null | ((current: string | null) => string | null)) => void
  onOpenQuickTaskComposer: (blockId: string) => void
  onResetTaskDraft: () => void
  onSetTaskDraftField: <K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) => void
  onAddTaskToBlock: (blockId: string) => void
  onSetTaskField: <K extends keyof ProjectBlock['tasks'][number]>(
    blockId: string,
    taskId: string,
    field: K,
    value: ProjectBlock['tasks'][number][K]
  ) => void
  onRemoveTask: (blockId: string, taskId: string) => void
  onKickoffMinutesChange: (value: string) => void
  onFinalizeKickoffMinutes: () => void
  onReopenKickoffMinutes: () => void
  onKickoffAttendeeAttendanceChange: (key: string, attended: boolean) => void
  onAddKickoffAttendee: (userId: string) => void
  onRemoveKickoffAttendee: (key: string) => void
  kickoffAttendeeOptions: ResponsibleOption[]
  departmentResponsibleOptions: (department?: string) => ResponsibleOption[]
  maxDeadline?: string
  canViewKickoffSection?: boolean
  canCreateBlocks?: boolean
  canEditBlock?: (block: ProjectBlock) => boolean
  canAccessBlockRoom?: (block: ProjectBlock) => boolean
  canEditBlockOwner?: boolean
}

const blockStatusTone = (status: string) => {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700'
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700'
  if (status === 'blocked') return 'bg-rose-100 text-rose-700'
  if (status === 'overdue') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

const deadlineTone = (deadline?: string) => {
  if (!deadline) return 'bg-slate-100 text-slate-700'
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const diffMs = new Date(deadline).getTime() - new Date(todayKey).getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'bg-rose-100 text-rose-700'
  if (diffDays <= 2) return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-700'
}

export default function ProjectBlocksTab({
  projectId,
  project,
  availableDepartments,
  blockDraft,
  taskDraft,
  showBlockComposer,
  editingBlockId,
  quickTaskBlockId,
  savingBlocks,
  dirtyBlocks,
  onSave,
  onResetBlockDraft,
  onSetBlockDraft,
  onCreateBlock,
  onSetBlockField,
  onRemoveBlock,
  onSetEditingBlockId,
  onOpenQuickTaskComposer,
  onResetTaskDraft,
  onSetTaskDraftField,
  onAddTaskToBlock,
  onSetTaskField,
  onRemoveTask,
  onKickoffMinutesChange,
  onFinalizeKickoffMinutes,
  onReopenKickoffMinutes,
  onKickoffAttendeeAttendanceChange,
  onAddKickoffAttendee,
  onRemoveKickoffAttendee,
  kickoffAttendeeOptions,
  departmentResponsibleOptions,
  maxDeadline,
  canViewKickoffSection = false,
  canCreateBlocks = false,
  canEditBlock = () => false,
  canAccessBlockRoom = () => false,
  canEditBlockOwner = false,
}: Props) {
  const [showKickoffAttendeeEditor, setShowKickoffAttendeeEditor] = useState(false)
  const [kickoffAttendeeDraft, setKickoffAttendeeDraft] = useState('none')
  const [showKickoffAttendees, setShowKickoffAttendees] = useState(false)
  const [showDepartmentPickerByBlock, setShowDepartmentPickerByBlock] = useState<Record<string, boolean>>({})
  const [viewingBlockId, setViewingBlockId] = useState<string | null>(null)

  const getDeadlineHint = (value?: string) => {
    const raw = String(value || '').trim()
    if (!raw) return 'Sense data'
    const target = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(target.getTime())) return 'Sense data'
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
    const diff = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `Retard ${Math.abs(diff)} dies`
    if (diff === 0) return 'Venc avui'
    if (diff === 1) return 'Falta 1 dia'
    return `Falten ${diff} dies`
  }

  const getAvailableDepartments = (block: ProjectBlock) => {
    const selected = getBlockDepartments(block)
    const available = availableDepartments.filter((department) => !selected.includes(department))
    const projectDepartments = available.filter((department) => project.departments.includes(department))
    const otherDepartments = available.filter((department) => !project.departments.includes(department))
    return [...projectDepartments, ...otherDepartments]
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[24px] bg-white/75 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={projectSectionTitleClass}>Blocs</h2>
            <p className={projectSectionSubtitleClass}>Fronts de treball del projecte.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={savingBlocks || !dirtyBlocks || !project.blocks.some((block) => canEditBlock(block))}
              className={`border-violet-200 ${
                dirtyBlocks && project.blocks.some((block) => canEditBlock(block))
                  ? 'text-violet-700 hover:bg-violet-50'
                  : 'cursor-not-allowed text-slate-400 hover:bg-transparent'
              }`}
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
            {showBlockComposer && canCreateBlocks ? (
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

        {showBlockComposer && canCreateBlocks ? (
          <div className="mt-4 grid gap-4 pt-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_180px_minmax(0,1fr)_220px_180px_auto]">
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
              <Label>Data final</Label>
              <Input
                type="date"
                value={blockDraft.deadline}
                max={maxDeadline || undefined}
                onChange={(event) =>
                  onSetBlockDraft((current) => ({ ...current, deadline: event.target.value }))
                }
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

        <div className="mt-4 space-y-4 pt-2">
          {project.blocks.length === 0 ? (
            <div className={`rounded-[24px] bg-slate-50/80 px-5 py-10 ${projectEmptyStateClass}`}>
              Encara no hi ha blocs. Crea el primer front de treball del projecte.
            </div>
          ) : (
            project.blocks.map((block) => {
              const canEditCurrentBlock = canEditBlock(block)
              const canAccessCurrentBlockRoom = canAccessBlockRoom(block)
              const isViewingReadonly = viewingBlockId === block.id && !canEditCurrentBlock
              const isExpanded = editingBlockId === block.id || isViewingReadonly
              const blockRoomId =
                project.rooms.find((room) => room.kind === 'block' && room.blockId === block.id)?.id ||
                `room-block-${block.id}`
              return (
              <div
                key={block.id}
                className={`space-y-4 rounded-[24px] p-5 ${
                  isExpanded && canEditCurrentBlock
                    ? 'bg-violet-50/70 ring-1 ring-violet-200'
                    : 'bg-slate-50/75'
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-3 rounded-[18px] ${
                    isExpanded && canEditCurrentBlock ? 'bg-white/80 px-2 py-1' : ''
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={projectCardTitleClass}>{block.name || 'Bloc sense nom'}</div>
                    </div>
                    <div className={`mt-1 flex flex-wrap items-center gap-2 ${projectCardMetaClass}`}>
                      {getBlockDepartments(block).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getBlockDepartments(block).map((department) => (
                            <span
                              key={`${block.id}-summary-${department}`}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${colorByDepartment(department)}`}
                            >
                              {department}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>Sense departament</span>
                      )}
                      <span>·</span>
                      <span>{block.owner || 'Sense responsable'}</span>
                      <span>·</span>
                      <span>{formatProjectDate(block.deadline) || 'Sense data'}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${deadlineTone(block.deadline)}`}>
                        {getDeadlineHint(block.deadline)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">Tasques:</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {block.tasks.filter((task) => task.status === 'pending').length} pendents
                      </span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {block.tasks.filter((task) => task.status === 'in_progress').length} en curs
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {block.tasks.filter((task) => task.status === 'done').length} fetes
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${blockStatusTone(block.status)}`}>
                      {BLOCK_STATUS_OPTIONS.find((option) => option.value === block.status)?.label || 'En curs'}
                    </span>
                    {canAccessCurrentBlockRoom ? (
                      <Button asChild type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                        <Link href={`/menu/projects/${projectId}/rooms/${blockRoomId}`}>
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : null}
                    {canEditCurrentBlock ? (
                      <>
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
                          className="h-9 w-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onRemoveBlock(block.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() =>
                          setViewingBlockId((current) => (current === block.id ? null : block.id))
                        }
                      >
                        {isViewingReadonly ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {editingBlockId === block.id && canEditCurrentBlock ? (
                  <>
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_160px_minmax(0,1.6fr)_180px]">
                        <div className="space-y-2">
                          <Label>Nom</Label>
                          <Input
                            value={block.name}
                            onChange={(event) => onSetBlockField(block.id, 'name', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data final</Label>
                          <Input
                            type="date"
                            value={block.deadline}
                            max={maxDeadline || undefined}
                            onChange={(event) => onSetBlockField(block.id, 'deadline', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Departaments</Label>
                          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                          {getBlockDepartments(block).map((department) => (
                            <span
                              key={`${block.id}-${department}`}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${colorByDepartment(department)}`}
                            >
                              {department}
                              <button
                                type="button"
                                className="text-slate-400 hover:text-red-600"
                                onClick={() =>
                                  onSetBlockField(
                                    block.id,
                                    'departments',
                                    getBlockDepartments(block).filter((item) => item !== department)
                                  )
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <Popover
                            open={Boolean(showDepartmentPickerByBlock[block.id])}
                            onOpenChange={(open) =>
                              setShowDepartmentPickerByBlock((current) => ({
                                ...current,
                                [block.id]: open,
                              }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[220px] p-1">
                              <div className="max-h-64 overflow-y-auto">
                                {getAvailableDepartments(block).length === 0 ? (
                                  <div className={`px-3 py-2 ${projectEmptyStateClass}`}>
                                    Sense departaments disponibles
                                  </div>
                                ) : (
                                  getAvailableDepartments(block).map((department) => (
                                    <button
                                      key={`${block.id}-${department}`}
                                      type="button"
                                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${colorByDepartment(department)} hover:brightness-95`}
                                      onClick={() => {
                                        onSetBlockField(block.id, 'departments', [
                                          ...getBlockDepartments(block),
                                          department,
                                        ])
                                        setShowDepartmentPickerByBlock((current) => ({
                                          ...current,
                                          [block.id]: false,
                                        }))
                                      }}
                                    >
                                      <span>{department}</span>
                                      {project.departments.includes(department) ? (
                                        <span className="ml-auto text-[10px] uppercase tracking-wide text-violet-600">
                                          Projecte
                                        </span>
                                      ) : (
                                        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">
                                          Altres
                                        </span>
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Responsable</Label>
                          <Select
                            value={block.owner || 'none'}
                            disabled={!canEditBlockOwner}
                            onValueChange={(value) =>
                              onSetBlockField(block.id, 'owner', value === 'none' ? '' : value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Responsable" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sense responsable</SelectItem>
                              {departmentResponsibleOptions(getBlockDepartments(block)).map((option) => (
                                <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!canEditBlockOwner ? (
                            <p className="text-xs text-slate-500">Només el responsable del projecte pot canviar aquest camp.</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_160px_180px]">
                        <div className="space-y-2">
                          <Label>Descripcio</Label>
                          <Textarea
                            value={block.summary}
                            onChange={(event) => onSetBlockField(block.id, 'summary', event.target.value)}
                            className="h-10 min-h-10 resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Comptador</Label>
                          <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-slate-600">
                            {getDeadlineHint(block.deadline)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cost del bloc</Label>
                          <Input
                            value={block.budget || ''}
                            onChange={(event) => onSetBlockField(block.id, 'budget', event.target.value)}
                            placeholder="Cost del bloc"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Tasques</Label>
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

                        {block.tasks.length === 0 ? (
                          <div className={`rounded-2xl bg-white/80 px-4 py-4 ${projectEmptyStateClass}`}>
                            Encara no hi ha tasques en aquest bloc.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {block.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="rounded-2xl bg-white px-4 py-3"
                              >
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_160px_150px_minmax(0,1fr)]">
                                  <div className="min-w-0">
                                    <Input
                                      value={task.title}
                                      onChange={(event) =>
                                        onSetTaskField(block.id, task.id, 'title', event.target.value)
                                      }
                                    />
                                  </div>
                                  <Select
                                    value={task.department || 'none'}
                                    onValueChange={(value) =>
                                      onSetTaskField(
                                        block.id,
                                        task.id,
                                        'department',
                                        value === 'none' ? '' : value
                                      )
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Departament" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sense departament</SelectItem>
                                      {getBlockDepartments(block).map((department) => (
                                        <SelectItem key={`${task.id}-${department}`} value={department}>
                                          {department}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="date"
                                    value={task.deadline}
                                    max={getPreLaunchDeadline(block.deadline) || maxDeadline || undefined}
                                    onChange={(event) =>
                                      onSetTaskField(block.id, task.id, 'deadline', event.target.value)
                                    }
                                  />
                                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] lg:grid-cols-[minmax(0,1fr)_110px_auto]">
                                    <Select
                                      value={task.priority || 'normal'}
                                      onValueChange={(value) =>
                                        onSetTaskField(block.id, task.id, 'priority', value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Nivell" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {TASK_PRIORITY_OPTIONS.slice(0, 3).map((option) => (
                                          <SelectItem key={`${task.id}-priority-${option.value}`} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex h-10 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">
                                      {TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label || 'Pendent'}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 rounded-full justify-self-start text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => onRemoveTask(block.id, task.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {quickTaskBlockId === block.id ? (
                          <ProjectTaskQuickComposer
                            description={taskDraft.description}
                            department={taskDraft.department}
                            deadline={taskDraft.deadline}
                            priority={taskDraft.priority || 'normal'}
                            departments={getBlockDepartments(block)}
                            maxDeadline={getPreLaunchDeadline(block.deadline) || maxDeadline || undefined}
                            onDescriptionChange={(value) => onSetTaskDraftField('description', value)}
                            onDepartmentChange={(value) => onSetTaskDraftField('department', value)}
                            onDeadlineChange={(value) => onSetTaskDraftField('deadline', value)}
                            onPriorityChange={(value) => onSetTaskDraftField('priority', value)}
                            onSubmit={() => onAddTaskToBlock(block.id)}
                          />
                        ) : null}
                      </div>
                    </div>

                  </>
                ) : null}

                {isViewingReadonly ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_180px]">
                      <div className="space-y-2">
                        <Label>Descripcio</Label>
                        <div className="rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-700">
                          {block.summary || 'Sense descripcio'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Comptador</Label>
                        <div className="flex h-10 items-center rounded-md border border-input bg-white px-3 text-sm text-slate-600">
                          {getDeadlineHint(block.deadline)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cost del bloc</Label>
                        <div className="flex h-10 items-center rounded-md border border-input bg-white px-3 text-sm text-slate-600">
                          {block.budget || 'Sense cost'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Tasques</Label>
                      {block.tasks.length === 0 ? (
                        <div className={`rounded-2xl bg-white/80 px-4 py-4 ${projectEmptyStateClass}`}>
                          Encara no hi ha tasques en aquest bloc.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {block.tasks.map((task) => (
                            <div key={task.id} className="rounded-2xl bg-white px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-medium text-slate-900">{task.title || 'Tasca'}</div>
                                <span className="text-sm text-slate-500">·</span>
                                <span className="text-sm text-slate-600">{task.owner || 'Sense responsable'}</span>
                                <span className="text-sm text-slate-500">·</span>
                                <span className="text-sm text-slate-600">{formatProjectDate(task.deadline)}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                {task.department ? (
                                  <span className={`rounded-full px-2.5 py-1 ${colorByDepartment(task.department)}`}>
                                    {task.department}
                                  </span>
                                ) : null}
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                  {TASK_PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label || 'Normal'}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                  {TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label || 'Pendent'}
                                </span>
                              </div>
                              {task.description ? (
                                <div className="mt-2 text-sm text-slate-600">{task.description}</div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

              </div>
            )})
          )}
        </div>
      </section>

      {canViewKickoffSection ? (
      <section className="space-y-4 rounded-[24px] bg-slate-50/80 p-5">
        <div>
          <h2 className={projectSectionTitleClass}>Acta kickoff</h2>
          <p className={projectSectionSubtitleClass}>
            Decisions, acords i punts clau treballats durant la reunió.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          {project.kickoff.minutesStatus === 'closed' ? (
            <Button
              type="button"
              size="sm"
              title="Reobrir acta"
              aria-label="Reobrir acta"
              onClick={onReopenKickoffMinutes}
              disabled={savingBlocks}
              className="rounded-full bg-amber-500 text-white shadow hover:bg-amber-600"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              title="Finalitzar acta"
              aria-label="Finalitzar acta"
              onClick={onFinalizeKickoffMinutes}
              disabled={savingBlocks}
              className="rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Textarea
          value={project.kickoff.minutes || ''}
          onChange={(event) => onKickoffMinutesChange(event.target.value)}
          disabled={project.kickoff.minutesStatus === 'closed'}
          className="min-h-[360px] bg-white"
          placeholder="Acta de la reunió de kickoff"
        />

        <div className="space-y-3 rounded-[22px] bg-white/90 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900">Assistents convocats</div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => {
                setShowKickoffAttendees((current) => !current)
                setShowKickoffAttendeeEditor(false)
              }}
            >
              <Users2 className="h-4 w-4" />
            </button>
          </div>

          {showKickoffAttendees ? (
            <>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-violet-700 hover:bg-violet-50"
                  onClick={() => {
                    setShowKickoffAttendeeEditor((current) => !current)
                    setKickoffAttendeeDraft('none')
                  }}
                >
                  Editar
                </Button>
              </div>

              {showKickoffAttendeeEditor ? (
                <div className="flex gap-3">
                  <Select value={kickoffAttendeeDraft} onValueChange={setKickoffAttendeeDraft}>
                    <SelectTrigger>
                      <SelectValue placeholder="Afegir assistent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecciona usuari</SelectItem>
                      {kickoffAttendeeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} · {option.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      if (kickoffAttendeeDraft === 'none') return
                      onAddKickoffAttendee(kickoffAttendeeDraft)
                      setKickoffAttendeeDraft('none')
                      setShowKickoffAttendeeEditor(false)
                    }}
                  >
                    Afegir
                  </Button>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {project.kickoff.attendees.length > 0 ? (
                  project.kickoff.attendees.map((attendee) => (
                    <div
                      key={attendee.key}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                        attendee.attended === false
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onKickoffAttendeeAttendanceChange(attendee.key, attendee.attended === false)
                        }
                        className="font-medium"
                      >
                        {attendee.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveKickoffAttendee(attendee.key)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className={`rounded-2xl bg-slate-50/80 px-3 py-3 ${projectEmptyStateClass}`}>
                    Encara no hi ha assistents convocats.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </section>
      ) : null}
    </div>
  )
}

