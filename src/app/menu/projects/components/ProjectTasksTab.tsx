'use client'

import { useState } from 'react'
import { Pencil, Save, Trash2 } from 'lucide-react'
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
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, type ProjectBlock, type ProjectTask } from './project-shared'
import { priorityBadgeClass, type ResponsibleOption } from './project-workspace-helpers'

type TaskDraft = {
  blockId: string
  title: string
  owner: string
  deadline: string
  dependsOn: string
  priority: string
  status: string
}

type TaskEntry = {
  block: ProjectBlock
  task: ProjectTask
  taskKey: string
}

type Props = {
  projectBlocks: ProjectBlock[]
  allTasks: TaskEntry[]
  taskDraft: TaskDraft
  showTaskComposer: boolean
  editingTaskKey: string | null
  savingBlocks: boolean
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
  taskResponsibleOptions: (department?: string) => ResponsibleOption[]
}

export default function ProjectTasksTab({
  projectBlocks,
  allTasks,
  taskDraft,
  showTaskComposer,
  editingTaskKey,
  savingBlocks,
  onSave,
  onResetTaskDraft,
  onSetTaskDraftField,
  onAddTaskToBlock,
  onSetEditingTaskKey,
  onRemoveTask,
  onSetTaskField,
  taskResponsibleOptions,
}: Props) {
  const [draggingTaskKey, setDraggingTaskKey] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  const draggingTask = allTasks.find(({ taskKey }) => taskKey === draggingTaskKey)

  const moveTaskToStatus = (blockId: string, taskId: string, status: string) => {
    onSetTaskField(blockId, taskId, 'status', status)
    setDragOverStatus(null)
    setDraggingTaskKey(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tasques</h2>
            <p className="text-sm text-slate-500">Canvas operatiu del projecte per estat.</p>
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
            {showTaskComposer ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onResetTaskDraft}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {showTaskComposer ? (
          <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1fr)_220px_180px_180px_auto]">
            <div className="space-y-2">
              <Label>Bloc</Label>
              <Select value={taskDraft.blockId} onValueChange={(value) => onSetTaskDraftField('blockId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona bloc" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona bloc</SelectItem>
                  {projectBlocks.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tasca</Label>
              <Input
                value={taskDraft.title}
                onChange={(event) => onSetTaskDraftField('title', event.target.value)}
                placeholder="Ex: Definir flux de proveidors"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                value={taskDraft.owner || 'none'}
                onValueChange={(value) => onSetTaskDraftField('owner', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sense responsable</SelectItem>
                  {taskResponsibleOptions(
                    projectBlocks.find((block) => block.id === taskDraft.blockId)?.department
                  ).map((option) => (
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
                value={taskDraft.deadline}
                onChange={(event) => onSetTaskDraftField('deadline', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioritat</Label>
              <Select value={taskDraft.priority} onValueChange={(value) => onSetTaskDraftField('priority', value)}>
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
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => {
                  if (taskDraft.blockId && taskDraft.blockId !== 'none') onAddTaskToBlock(taskDraft.blockId)
                }}
              >
                Afegir
              </Button>
            </div>
          </div>
        ) : null}

        {allTasks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-sm text-slate-500">
            Encara no hi ha tasques creades.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto border-t border-slate-200 pt-4">
            <div className="grid min-w-[1180px] grid-cols-4 gap-4">
              {TASK_STATUS_OPTIONS.map((statusOption) => {
                const columnTasks = allTasks.filter(({ task }) => task.status === statusOption.value)

                return (
                  <div
                    key={statusOption.value}
                    className={`rounded-[24px] border p-4 transition ${
                      dragOverStatus === statusOption.value
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
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
                        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                          Sense tasques.
                        </div>
                      ) : (
                        columnTasks.map(({ block, task, taskKey }) => (
                          <div
                            key={taskKey}
                            draggable
                            onDragStart={() => setDraggingTaskKey(taskKey)}
                            onDragEnd={() => {
                              setDraggingTaskKey(null)
                              setDragOverStatus(null)
                            }}
                            onDrop={(event) => {
                              event.stopPropagation()
                              event.preventDefault()
                              moveTaskToStatus(block.id, task.id, statusOption.value)
                            }}
                            className={`rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition ${
                              draggingTaskKey === taskKey ? 'cursor-grabbing opacity-60' : 'cursor-grab'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900">{task.title}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                    {block.name}
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityBadgeClass(task.priority)}`}
                                  >
                                    {TASK_PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label || 'Normal'}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span>{task.owner || 'Sense responsable'}</span>
                                  <span>·</span>
                                  <span>{task.deadline || 'Sense data'}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
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
                              </div>
                            </div>

                            {editingTaskKey === taskKey ? (
                              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                <div className="space-y-2">
                                  <Label>Tasca</Label>
                                  <Input
                                    value={task.title}
                                    onChange={(event) => onSetTaskField(block.id, task.id, 'title', event.target.value)}
                                  />
                                </div>

                                <div className="grid gap-3">
                                  <div className="space-y-2">
                                    <Label>Responsable</Label>
                                    <Select
                                      value={task.owner || 'none'}
                                      onValueChange={(value) =>
                                        onSetTaskField(block.id, task.id, 'owner', value === 'none' ? '' : value)
                                      }
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
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>Data objectiu</Label>
                                      <Input
                                        type="date"
                                        value={task.deadline}
                                        onChange={(event) =>
                                          onSetTaskField(block.id, task.id, 'deadline', event.target.value)
                                        }
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Prioritat</Label>
                                      <Select
                                        value={task.priority}
                                        onValueChange={(value) => onSetTaskField(block.id, task.id, 'priority', value)}
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
                                    </div>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label>Depen de</Label>
                                      <Select
                                        value={task.dependsOn || 'none'}
                                        onValueChange={(value) =>
                                          onSetTaskField(
                                            block.id,
                                            task.id,
                                            'dependsOn',
                                            value === 'none' ? '' : value
                                          )
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Cap</SelectItem>
                                          {block.tasks
                                            .filter((item) => item.id !== task.id)
                                            .map((item) => (
                                              <SelectItem key={item.id} value={item.id}>
                                                {item.title}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Estat</Label>
                                      <Select
                                        value={task.status}
                                        onValueChange={(value) => onSetTaskField(block.id, task.id, 'status', value)}
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
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))
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
