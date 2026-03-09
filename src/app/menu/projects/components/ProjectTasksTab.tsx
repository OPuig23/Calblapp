'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Paperclip, Pencil, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import FilterButton from '@/components/ui/filter-button'
import ResetFilterButton from '@/components/ui/ResetFilterButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFilters } from '@/context/FiltersContext'
import { colorByDepartment } from '@/lib/colors'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatProjectCost,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  formatProjectDate,
  getPreLaunchDeadline,
  parseProjectCost,
  type ProjectDocument,
  type ProjectBlock,
  type ProjectTask,
} from './project-shared'
import ProjectTaskQuickComposer from './ProjectTaskQuickComposer'
import {
  projectEmptyStateClass,
  projectSectionSubtitleClass,
  projectSectionTitleClass,
} from './project-ui'
import { type ResponsibleOption } from './project-workspace-helpers'

type TaskDraft = {
  blockId: string
  title: string
  description: string
  department: string
  owner: string
  deadline: string
  priority: string
}

type TaskEntry = {
  block: ProjectBlock
  task: ProjectTask
  taskKey: string
}

type Props = {
  projectId: string
  projectBlocks: ProjectBlock[]
  projectRooms: Array<{ id: string; blockId?: string; kind: 'block' | 'manual' }>
  allTasks: TaskEntry[]
  taskDraft: TaskDraft
  showTaskComposer: boolean
  editingTaskKey: string | null
  savingBlocks: boolean
  dirtyBlocks: boolean
  onSave: () => void
  onResetTaskDraft: () => void
  onSetTaskDraftField: <K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) => void
  onAddTaskToBlock: (blockId: string) => void
  onSetEditingTaskKey: (value: string | null | ((current: string | null) => string | null)) => void
  onRemoveTask: (blockId: string, taskId: string) => void
  onSetTaskField: <K extends keyof ProjectTask>(
    blockId: string,
    taskId: string,
    field: K,
    value: ProjectTask[K]
  ) => void
  onAttachTaskDocument: (blockId: string, taskId: string, file: File) => void
  onRemoveTaskDocument: (blockId: string, taskId: string, documentId: string) => void
  taskResponsibleOptions: (department?: string, blockId?: string) => ResponsibleOption[]
  maxDeadline?: string
  canCreateTasks?: boolean
  canSaveTasks?: boolean
  canManageTask?: (block: ProjectBlock, task: ProjectTask) => boolean
  canAccessTaskOps?: (block: ProjectBlock, task: ProjectTask) => boolean
  canMoveTask?: (block: ProjectBlock, task: ProjectTask) => boolean
}

const documentName = (document?: ProjectDocument) =>
  String(document?.name || document?.label || 'Document').trim()

export default function ProjectTasksTab({
  projectId,
  projectBlocks,
  projectRooms,
  allTasks,
  taskDraft,
  showTaskComposer,
  editingTaskKey,
  savingBlocks,
  dirtyBlocks,
  onSave,
  onResetTaskDraft,
  onSetTaskDraftField,
  onAddTaskToBlock,
  onSetEditingTaskKey,
  onRemoveTask,
  onSetTaskField,
  onAttachTaskDocument,
  onRemoveTaskDocument,
  taskResponsibleOptions,
  maxDeadline,
  canCreateTasks = false,
  canSaveTasks = false,
  canManageTask = () => false,
  canAccessTaskOps = () => false,
  canMoveTask = () => false,
}: Props) {
  const { setContent, setOpen } = useFilters()
  const [draggingTaskKey, setDraggingTaskKey] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const [blockFilter, setBlockFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [locallyDirtyTaskKeys, setLocallyDirtyTaskKeys] = useState<string[]>([])
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const hasPendingTaskDraft =
    showTaskComposer &&
    Boolean(String(taskDraft.blockId || '').trim()) &&
    String(taskDraft.blockId || '').trim() !== 'none' &&
    Boolean(String(taskDraft.description || taskDraft.title || '').trim())
  const filteredTasks = allTasks.filter(({ block, task }) => {
    const matchesBlock = blockFilter === 'all' || block.id === blockFilter
    const matchesLevel = levelFilter === 'all' || (task.priority || 'normal') === levelFilter
    return matchesBlock && matchesLevel
  })
  const draggingTask = filteredTasks.find(({ taskKey }) => taskKey === draggingTaskKey)
  const roomIdByBlockId = new Map(
    projectRooms
      .filter((room) => room.kind === 'block' && room.blockId)
      .map((room) => [String(room.blockId), room.id])
  )
  const dirtyTasks = dirtyBlocks || locallyDirtyTaskKeys.length > 0 || hasPendingTaskDraft

  useEffect(() => {
    if (!savingBlocks && !dirtyBlocks) {
      setLocallyDirtyTaskKeys([])
    }
  }, [dirtyBlocks, savingBlocks])

  const markTaskDirty = (taskKey: string) => {
    setLocallyDirtyTaskKeys((current) =>
      current.includes(taskKey) ? current : [...current, taskKey]
    )
  }

  const moveTaskToStatus = (blockId: string, taskId: string, status: string) => {
    const currentTask = allTasks.find((item) => item.block.id === blockId && item.task.id === taskId)?.task
    const canLeavePending =
      currentTask?.status !== 'pending' ||
      (String(currentTask?.owner || '').trim() && String(currentTask?.deadline || '').trim())

    const currentEntry = allTasks.find((item) => item.block.id === blockId && item.task.id === taskId)
    if (!currentEntry || !canMoveTask(currentEntry.block, currentEntry.task)) {
      setDragOverStatus(null)
      setDraggingTaskKey(null)
      return
    }

    if (!canLeavePending && status !== 'pending') {
      setDragOverStatus(null)
      setDraggingTaskKey(null)
      return
    }

    onSetTaskField(blockId, taskId, 'status', status)
    markTaskDirty(`${blockId}:${taskId}`)
    setDragOverStatus(null)
    setDraggingTaskKey(null)
  }

  const openFiltersPanel = () => {
    setContent(
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Bloc</label>
          <Select value={blockFilter} onValueChange={setBlockFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tots els blocs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els blocs</SelectItem>
              {projectBlocks.map((block) => (
                <SelectItem key={`filter-block-${block.id}`} value={block.id}>
                  {block.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Nivell</label>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tots els nivells" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els nivells</SelectItem>
              {TASK_PRIORITY_OPTIONS.slice(0, 3).map((option) => (
                <SelectItem key={`filter-priority-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <ResetFilterButton
            onClick={() => {
              setBlockFilter('all')
              setLevelFilter('all')
            }}
          />
        </div>
      </div>
    )
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-white/75 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className={projectSectionTitleClass}>Tasques</h2>
            <p className={projectSectionSubtitleClass}>Canvas operatiu del projecte per estat.</p>
          </div>
          <div className="flex items-center gap-2">
            <FilterButton onClick={openFiltersPanel} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (hasPendingTaskDraft && taskDraft.blockId && taskDraft.blockId !== 'none') {
                  onAddTaskToBlock(taskDraft.blockId)
                }
                onSave()
              }}
              disabled={savingBlocks || !canSaveTasks || !dirtyTasks}
              className={`border-violet-200 ${
                savingBlocks
                  ? 'cursor-wait text-violet-400'
                  : canSaveTasks && dirtyTasks
                    ? 'text-violet-700 hover:bg-violet-50'
                    : 'cursor-not-allowed text-slate-400 hover:bg-transparent'
              }`}
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </div>
        </div>

        {showTaskComposer && canCreateTasks ? (
          <div className="mt-4 pt-2">
            <ProjectTaskQuickComposer
              blockId={taskDraft.blockId}
              blocks={projectBlocks.map((block) => ({
                id: block.id,
                name: block.name,
                departments: block.departments,
                deadline: block.deadline,
              }))}
              description={taskDraft.description || taskDraft.title}
              department={taskDraft.department}
              owner={taskDraft.owner}
              deadline={taskDraft.deadline}
              priority={taskDraft.priority || 'normal'}
              departments={projectBlocks.find((block) => block.id === taskDraft.blockId)?.departments || []}
              responsibleOptions={taskResponsibleOptions(
                taskDraft.department ||
                  projectBlocks.find((block) => block.id === taskDraft.blockId)?.departments?.[0] ||
                  '',
                taskDraft.blockId
              ).map((option) => ({
                id: option.id,
                name: option.name,
              }))}
              maxDeadline={
                getPreLaunchDeadline(projectBlocks.find((block) => block.id === taskDraft.blockId)?.deadline) ||
                maxDeadline ||
                undefined
              }
              showBlockSelector
              disabled={savingBlocks || !taskDraft.blockId || taskDraft.blockId === 'none'}
              onBlockChange={(value) => onSetTaskDraftField('blockId', value)}
              onDescriptionChange={(value) => {
                onSetTaskDraftField('description', value)
                onSetTaskDraftField('title', value)
              }}
              onDepartmentChange={(value) => onSetTaskDraftField('department', value)}
              onOwnerChange={(value) => onSetTaskDraftField('owner', value)}
              onDeadlineChange={(value) => onSetTaskDraftField('deadline', value)}
              onPriorityChange={(value) => onSetTaskDraftField('priority', value)}
              onSubmit={() => {
                if (taskDraft.blockId && taskDraft.blockId !== 'none') onAddTaskToBlock(taskDraft.blockId)
              }}
            />
          </div>
        ) : null}

        {filteredTasks.length === 0 ? (
          <div className={`mt-4 rounded-2xl bg-slate-50/80 px-6 py-10 ${projectEmptyStateClass}`}>
            Encara no hi ha tasques creades.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto pt-2">
            <div className="grid min-w-[1180px] grid-cols-4 gap-4">
              {TASK_STATUS_OPTIONS.map((statusOption) => {
                const columnTasks = filteredTasks.filter(({ task }) => task.status === statusOption.value)

                return (
                  <div
                    key={statusOption.value}
                    className={`rounded-[24px] p-4 transition ${dragOverStatus === statusOption.value ? 'bg-violet-50' : 'bg-slate-50/70'}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (draggingTaskKey) setDragOverStatus(statusOption.value)
                    }}
                    onDragLeave={() => {
                      if (dragOverStatus === statusOption.value) setDragOverStatus(null)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (!draggingTask) return
                      moveTaskToStatus(draggingTask.block.id, draggingTask.task.id, statusOption.value)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{statusOption.label}</div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {columnTasks.length === 0 ? (
                        <div className={`rounded-2xl bg-white/70 px-4 py-5 ${projectEmptyStateClass}`}>
                          Sense tasques.
                        </div>
                      ) : (
                        columnTasks.map(({ block, task, taskKey }) => {
                          const roomId = roomIdByBlockId.get(block.id) || `room-block-${block.id}`
                          const canManageCurrentTask = canManageTask(block, task)
                          const canAccessOpsCurrentTask = canAccessTaskOps(block, task)
                          const canMoveCurrentTask = canMoveTask(block, task)

                          return (
                          <div
                            key={taskKey}
                            draggable={canMoveCurrentTask}
                            onDragStart={() => {
                              if (!canMoveCurrentTask) return
                              setDraggingTaskKey(taskKey)
                            }}
                            onDragEnd={() => {
                              setDraggingTaskKey(null)
                              setDragOverStatus(null)
                            }}
                            className={`rounded-[22px] bg-white p-4 shadow-sm transition ${
                              draggingTaskKey === taskKey ? 'cursor-grabbing opacity-60' : 'cursor-grab'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-base font-semibold text-slate-900">{task.title}</div>
                                <div className="mt-3 flex items-center gap-2.5 whitespace-nowrap text-sm text-slate-500">
                                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                                    {block.name}
                                  </span>
                                  {task.department ? (
                                    <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${colorByDepartment(task.department)}`}>
                                      {task.department}
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700">
                                    {TASK_PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label || 'Normal'}
                                  </span>
                                  <span className="text-xs text-slate-500">{formatProjectDate(task.deadline)}</span>
                                  {(task.documents || []).length > 0 ? (
                                    <>
                                      <span className="text-xs text-slate-400">·</span>
                                      <span className="text-xs text-slate-500">{(task.documents || []).length} docs</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {canAccessOpsCurrentTask ? (
                                  <Button asChild type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <Link href={`/menu/projects/${projectId}/rooms/${roomId}`}>
                                      <MessageSquare className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                ) : null}
                                <input
                                  ref={(node) => {
                                    fileInputsRef.current[taskKey] = node
                                  }}
                                  type="file"
                                  className="hidden"
                                  onChange={(event) => {
                                    if (!canAccessOpsCurrentTask) return
                                    const file = event.target.files?.[0]
                                    if (!file) return
                                    onAttachTaskDocument(block.id, task.id, file)
                                    event.currentTarget.value = ''
                                  }}
                                />
                                {canAccessOpsCurrentTask ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => fileInputsRef.current[taskKey]?.click()}
                                  >
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                {canManageCurrentTask ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={() =>
                                        onSetEditingTaskKey((current) => (current === taskKey ? null : taskKey))
                                      }
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => onRemoveTask(block.id, task.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {editingTaskKey === taskKey && canManageCurrentTask ? (
                              <div className="mt-4 space-y-3 pt-3">
                                <div className="grid gap-3 sm:grid-cols-[130px_170px_minmax(0,1fr)]">
                                  <div className="min-w-0">
                                    <Select
                                      value={task.priority || 'normal'}
                                      onValueChange={(value) => {
                                        onSetTaskField(block.id, task.id, 'priority', value)
                                        markTaskDirty(taskKey)
                                      }}
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
                                  </div>
                                  <div className="min-w-0">
                                    <Input
                                      type="date"
                                      value={task.deadline}
                                      aria-label="Data limit"
                                      max={getPreLaunchDeadline(block.deadline) || maxDeadline || undefined}
                                      onChange={(event) => {
                                        onSetTaskField(block.id, task.id, 'deadline', event.target.value)
                                        markTaskDirty(taskKey)
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <Input
                                      value={task.cost || ''}
                                      placeholder="Cost"
                                      onChange={(event) => {
                                        onSetTaskField(block.id, task.id, 'cost', event.target.value)
                                        markTaskDirty(taskKey)
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  <div className="min-w-0">
                                    <Select
                                      value={task.owner || 'none'}
                                      onValueChange={(value) => {
                                        onSetTaskField(block.id, task.id, 'owner', value === 'none' ? '' : value)
                                        markTaskDirty(taskKey)
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Responsable" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sense responsable</SelectItem>
                                        {taskResponsibleOptions(
                                          task.department || block.departments?.[0] || block.department || '',
                                          block.id
                                        ).map((option) => (
                                          <SelectItem key={`${option.id}-${option.name}`} value={option.name}>
                                            {option.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {(task.documents || []).length > 0 ? (
                                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                      Documents
                                    </div>
                                    <div className="space-y-2">
                                      {(task.documents || []).map((document) => (
                                        <div key={document?.id || documentName(document)} className="flex items-center justify-between gap-3 text-sm">
                                          <button
                                            type="button"
                                            className="truncate text-left text-slate-700 hover:text-violet-700"
                                            onClick={() => {
                                              if (document?.url) window.open(document.url, '_blank', 'noopener,noreferrer')
                                            }}
                                          >
                                            {documentName(document)}
                                          </button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                                            onClick={() => {
                                              if (document?.id) onRemoveTaskDocument(block.id, task.id, document.id)
                                            }}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

