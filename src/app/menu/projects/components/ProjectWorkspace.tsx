'use client'

import { useEffect, useMemo, useState } from 'react'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { toast } from '@/components/ui/use-toast'
import { normalizeRole } from '@/lib/roles'
import {
  type KickoffAttendee,
  type ProjectBlock,
  type ProjectData,
  type ProjectTask,
} from './project-shared'
import ProjectBlocksTab from './ProjectBlocksTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'
import ProjectKickoffTab from './ProjectKickoffTab'
import ProjectOverviewTab from './ProjectOverviewTab'
import ProjectRoomsTab from './ProjectRoomsTab'
import ProjectTasksTab from './ProjectTasksTab'
import ProjectTrackingTab from './ProjectTrackingTab'
import ProjectWorkspaceShell from './ProjectWorkspaceShell'
import {
  createBlockDraft,
  createTaskDraft,
  normalizeDepartment,
  type ResponsibleOption,
  type WorkspaceTab,
} from './project-workspace-helpers'

type Props = {
  projectId: string
  initialProject: ProjectData
}

export default function ProjectWorkspace({ projectId, initialProject }: Props) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [project, setProject] = useState<ProjectData>(initialProject)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [usersCatalog, setUsersCatalog] = useState<ResponsibleOption[]>([])
  const [responsibles, setResponsibles] = useState<ResponsibleOption[]>([])
  const [savingOverview, setSavingOverview] = useState(false)
  const [savingBlocks, setSavingBlocks] = useState(false)
  const [sendingKickoff, setSendingKickoff] = useState(false)
  const [manualKickoffEmail, setManualKickoffEmail] = useState('')
  const [blockDraft, setBlockDraft] = useState(createBlockDraft())
  const [taskDraft, setTaskDraft] = useState(createTaskDraft())
  const [showBlockComposer, setShowBlockComposer] = useState(false)
  const [showTaskComposer, setShowTaskComposer] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingTaskKey, setEditingTaskKey] = useState<string | null>(null)
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>([])
  const [quickTaskBlockId, setQuickTaskBlockId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        if (!res.ok) throw new Error('No s han pogut carregar els usuaris')
        const users = (await res.json()) as Array<{
          id: string
          name?: string
          role?: string
          email?: string
          department?: string
        }>

        const catalog = users
          .map((user) => ({
            id: user.id,
            name: String(user.name || '').trim(),
            role: normalizeRole(user.role || ''),
            email: String(user.email || '').trim(),
            department: String(user.department || '').trim(),
          }))
          .filter((user) => user.name)
          .sort((a, b) => a.name.localeCompare(b.name))

        const next = catalog.filter((user) => {
          return user.role === 'admin' || user.role === 'direccio' || user.role === 'cap'
        })

        if (!cancelled) {
          setUsersCatalog(catalog)
          setResponsibles(next)
        }
      } catch {
        if (!cancelled) {
          setUsersCatalog([])
          setResponsibles([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const ownerOptions = useMemo(() => {
    if (project.owner && !responsibles.some((item) => item.name === project.owner)) {
      return [
        { id: 'current', name: project.owner, role: 'current', email: '', department: '' },
        ...responsibles,
      ]
    }
    return responsibles
  }, [project.owner, responsibles])

  const departmentResponsibleOptions = (department?: string) => {
    const normalized = normalizeDepartment(department || '')
    if (!normalized) return ownerOptions

    const filtered = responsibles.filter(
      (user) =>
        user.role === 'cap' && normalizeDepartment(user.department || '') === normalized
    )

    return filtered.length > 0 ? filtered : ownerOptions
  }

  const ensureDepartmentBlocks = (currentProject: ProjectData) => {
    const existingDepartmentKeys = new Set(
      currentProject.blocks
        .map((block) => normalizeDepartment(block.department || block.name || ''))
        .filter(Boolean)
    )

    const missingBlocks = currentProject.departments
      .filter((department) => !existingDepartmentKeys.has(normalizeDepartment(department)))
      .map((department) => {
        const defaultOwner = departmentResponsibleOptions(department)[0]?.name || ''
        return {
          id: `block-${Date.now()}-${department}`,
          name: department,
          summary: '',
          department,
          owner: defaultOwner,
          deadline: '',
          dependsOn: '',
          status: 'pending',
          tasks: [],
        }
      })

    if (missingBlocks.length === 0) return currentProject

    return {
      ...currentProject,
      blocks: [...currentProject.blocks, ...missingBlocks],
    }
  }

  const taskResponsibleOptions = (department?: string) => {
    const normalized = normalizeDepartment(department || '')
    if (!normalized) return ownerOptions

    const filtered = usersCatalog.filter(
      (user) => normalizeDepartment(user.department || '') === normalized
    )

    return filtered.length > 0 ? filtered : departmentResponsibleOptions(department)
  }

  const departmentHeadOptions = useMemo(
    () =>
      project.departments.map((department) => ({
        department,
        options: responsibles.filter(
          (user) =>
            user.role === 'cap' &&
            user.email &&
            normalizeDepartment(user.department) === normalizeDepartment(department)
        ),
      })),
    [project.departments, responsibles]
  )

  useEffect(() => {
    setProject((current) => {
      const byKey = new Map(current.kickoff.attendees.map((item) => [item.key, item]))
      const nextAttendees: KickoffAttendee[] = []
      const ownerUser = responsibles.find((item) => item.name === current.owner && item.email)

      if (ownerUser && !current.kickoff.excludedKeys.includes('owner')) {
        nextAttendees.push({
          key: 'owner',
          department: 'Responsable projecte',
          userId: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
        })
      }

      for (const entry of departmentHeadOptions) {
        const key = `department:${entry.department}`
        if (current.kickoff.excludedKeys.includes(key)) continue

        const existing = byKey.get(key)
        if (existing && entry.options.some((option) => option.id === existing.userId)) {
          nextAttendees.push(existing)
          continue
        }

        if (entry.options.length === 1) {
          const option = entry.options[0]
          nextAttendees.push({
            key,
            department: entry.department,
            userId: option.id,
            name: option.name,
            email: option.email,
          })
        }
      }

      for (const item of current.kickoff.attendees) {
        if (item.key.startsWith('manual:')) nextAttendees.push(item)
      }

      const same =
        nextAttendees.length === current.kickoff.attendees.length &&
        nextAttendees.every((item, index) => {
          const currentItem = current.kickoff.attendees[index]
          return (
            currentItem?.key === item.key &&
            currentItem?.userId === item.userId &&
            currentItem?.email === item.email &&
            currentItem?.name === item.name
          )
        })

      if (same) return current

      return {
        ...current,
        kickoff: {
          ...current.kickoff,
          attendees: nextAttendees,
        },
      }
    })
  }, [departmentHeadOptions, responsibles])

  const buildProjectForm = (sourceProject: ProjectData = project) => {
    const form = new FormData()
    form.set('name', sourceProject.name)
    form.set('sponsor', sourceProject.sponsor)
    form.set('owner', sourceProject.owner)
    form.set('context', sourceProject.context)
    form.set('strategy', sourceProject.strategy)
    form.set('risks', sourceProject.risks)
    form.set('startDate', sourceProject.startDate)
    form.set('launchDate', sourceProject.launchDate)
    form.set('budget', sourceProject.budget)
    form.set('phase', sourceProject.phase)
    form.set('status', sourceProject.status)
    form.set('departments', JSON.stringify(sourceProject.departments))
    form.set('blocks', JSON.stringify(sourceProject.blocks))
    form.set('kickoff', JSON.stringify(sourceProject.kickoff))
    if (pendingFile) form.set('file', pendingFile)
    return form
  }

  const saveProject = async (title: string, sourceProject: ProjectData = project) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: buildProjectForm(sourceProject),
    })
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) throw new Error(payload.error || 'No s ha pogut guardar el projecte')

    if (pendingFile) {
      setProject((current) => ({
        ...current,
        document: {
          ...(current.document || {}),
          name: pendingFile.name,
        },
      }))
      setPendingFile(null)
    }

    toast({ title })
  }

  const saveOverview = async () => {
    try {
      setSavingOverview(true)
      const nextProject = ensureDepartmentBlocks(project)
      setProject(nextProject)
      await saveProject('Projecte guardat', nextProject)
    } catch (err: unknown) {
      toast({
        title: 'Error guardant el projecte',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingOverview(false)
    }
  }

  const saveBlocks = async () => {
    try {
      setSavingBlocks(true)
      await saveProject('Blocs guardats')
    } catch (err: unknown) {
      toast({
        title: 'Error guardant els blocs',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingBlocks(false)
    }
  }

  const toggleDepartment = (department: string) => {
    setProject((current) => ({
      ...current,
      departments: current.departments.includes(department)
        ? current.departments.filter((item) => item !== department)
        : [...current.departments, department],
    }))
  }

  const setKickoffField = <K extends keyof ProjectData['kickoff']>(field: K, value: ProjectData['kickoff'][K]) => {
    setProject((current) => ({
      ...current,
      kickoff: {
        ...current.kickoff,
        [field]: value,
      },
    }))
  }

  const setDepartmentAttendee = (department: string, userId: string) => {
    const option = responsibles.find((item) => item.id === userId)
    if (!option) return
    const key = `department:${department}`

    setProject((current) => ({
      ...current,
      kickoff: {
        ...current.kickoff,
        excludedKeys: current.kickoff.excludedKeys.filter((item) => item !== key),
        attendees: [
          ...current.kickoff.attendees.filter((item) => item.key !== key),
          {
            key,
            department,
            userId: option.id,
            name: option.name,
            email: option.email,
          },
        ],
      },
    }))
  }

  const removeKickoffAttendee = (key: string) => {
    setProject((current) => ({
      ...current,
      kickoff: {
        ...current.kickoff,
        attendees: current.kickoff.attendees.filter((item) => item.key !== key),
        excludedKeys: key.startsWith('manual:')
          ? current.kickoff.excludedKeys
          : [...new Set([...current.kickoff.excludedKeys, key])],
      },
    }))
  }

  const addManualKickoffEmail = () => {
    const email = manualKickoffEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    const key = `manual:${email}`

    setProject((current) => {
      if (current.kickoff.attendees.some((item) => item.key === key)) return current
      return {
        ...current,
        kickoff: {
          ...current.kickoff,
          attendees: [
            ...current.kickoff.attendees,
            {
              key,
              department: 'Manual',
              userId: '',
              name: email,
              email,
            },
          ],
        },
      }
    })
    setManualKickoffEmail('')
  }

  const kickoffReady =
    Boolean(project.kickoff.date) &&
    Boolean(project.kickoff.startTime) &&
    Number(project.kickoff.durationMinutes) > 0 &&
    project.kickoff.attendees.some((item) => item.email.includes('@'))

  const sendKickoff = async () => {
    try {
      setSendingKickoff(true)
      const res = await fetch(`/api/projects/${projectId}/kickoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: project.kickoff.date,
          startTime: project.kickoff.startTime,
          durationMinutes: project.kickoff.durationMinutes,
          notes: project.kickoff.notes,
          attendees: project.kickoff.attendees,
        }),
      })

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string
        kickoff?: ProjectData['kickoff']
      }
      if (!res.ok || !payload.kickoff) {
        throw new Error(payload.error || 'No s ha pogut crear la convocatoria')
      }

      setProject((current) => ({
        ...current,
        phase: 'kickoff',
        status: 'kickoff',
        kickoff: {
          ...current.kickoff,
          ...payload.kickoff,
        },
      }))

      toast({ title: 'Convocatoria enviada' })
    } catch (err: unknown) {
      toast({
        title: 'Error enviant la convocatoria',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSendingKickoff(false)
    }
  }

  const createBlock = () => {
    if (!blockDraft.name.trim()) return

    const nextBlock: ProjectBlock = {
      id: `block-${Date.now()}`,
      name: blockDraft.name.trim(),
      summary: blockDraft.summary.trim(),
      department: blockDraft.department,
      owner: blockDraft.owner,
      deadline: blockDraft.deadline,
      dependsOn: blockDraft.dependsOn === 'none' ? '' : blockDraft.dependsOn,
      status: blockDraft.status,
      tasks: [],
    }

    setProject((current) => ({
      ...current,
      blocks: [...current.blocks, nextBlock],
      phase: current.phase === 'kickoff' || current.phase === 'definition' ? 'planning' : current.phase,
      status: current.status === 'kickoff' || current.status === 'definition' ? 'planning' : current.status,
    }))
    setExpandedBlocks((current) => [...new Set([...current, nextBlock.id])])
    setBlockDraft(createBlockDraft())
    setShowBlockComposer(false)
  }

  const setBlockField = <K extends keyof ProjectBlock>(blockId: string, field: K, value: ProjectBlock[K]) => {
    setProject((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? { ...block, [field]: value } : block)),
    }))
  }

  const removeBlock = (blockId: string) => {
    setProject((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }))
    setExpandedBlocks((current) => current.filter((id) => id !== blockId))
    setEditingBlockId((current) => (current === blockId ? null : current))
  }

  const toggleBlockExpanded = (blockId: string) => {
    setExpandedBlocks((current) =>
      current.includes(blockId) ? current.filter((id) => id !== blockId) : [...current, blockId]
    )
  }

  const setTaskDraftField = <K extends keyof ReturnType<typeof createTaskDraft>>(
    field: K,
    value: ReturnType<typeof createTaskDraft>[K]
  ) => {
    setTaskDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const addTaskToBlock = (blockId: string) => {
    const draft = taskDraft
    if (!draft.title.trim()) return

    const nextTask: ProjectTask = {
      id: `task-${Date.now()}`,
      title: draft.title.trim(),
      owner: draft.owner,
      deadline: draft.deadline,
      dependsOn: draft.dependsOn === 'none' ? '' : draft.dependsOn,
      priority: draft.priority,
      status: draft.status,
    }

    setProject((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId ? { ...block, tasks: [...block.tasks, nextTask] } : block
      ),
    }))
    setTaskDraft(createTaskDraft())
    setShowTaskComposer(false)
    setQuickTaskBlockId(null)
  }

  const setTaskField = <K extends keyof ProjectTask>(
    blockId: string,
    taskId: string,
    field: K,
    value: ProjectTask[K]
  ) => {
    setProject((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              tasks: block.tasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task)),
            }
          : block
      ),
    }))
  }

  const removeTask = (blockId: string, taskId: string) => {
    setProject((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id === blockId
          ? { ...block, tasks: block.tasks.filter((task) => task.id !== taskId) }
          : block
      ),
    }))
  }

  const resetTaskDraft = () => {
    setTaskDraft(createTaskDraft())
    setShowTaskComposer(false)
    setQuickTaskBlockId(null)
  }

  const openQuickTaskComposer = (blockId: string) => {
    setTaskDraft((current) => ({
      ...createTaskDraft(),
      blockId,
      owner: current.blockId === blockId ? current.owner : '',
    }))
    setQuickTaskBlockId(blockId)
    setExpandedBlocks((current) => [...new Set([...current, blockId])])
  }

  const resetBlockDraft = () => {
    setBlockDraft(createBlockDraft())
    setShowBlockComposer(false)
  }

  const allTasks = project.blocks.flatMap((block) =>
    block.tasks.map((task) => ({
      block,
      task,
      taskKey: `${block.id}:${task.id}`,
    }))
  )

  return (
    <div className="space-y-6">
      <ProjectWorkspaceShell project={project} activeTab={activeTab} onTabChange={setActiveTab} />

      <section className="rounded-[28px] border border-violet-200 bg-white shadow-sm">
        <div className="p-6">
          {activeTab === 'overview' ? (
            <ProjectOverviewTab
              project={project}
              ownerOptions={ownerOptions}
              pendingFile={pendingFile}
              savingOverview={savingOverview}
              onSave={saveOverview}
              onToggleDepartment={toggleDepartment}
              onProjectChange={setProject}
              onPendingFileChange={setPendingFile}
            />
          ) : null}

          {activeTab === 'kickoff' ? (
            <ProjectKickoffTab
              project={project}
              manualKickoffEmail={manualKickoffEmail}
              departmentHeadOptions={departmentHeadOptions}
              kickoffReady={kickoffReady}
              sendingKickoff={sendingKickoff}
              onKickoffFieldChange={setKickoffField}
              onManualKickoffEmailChange={setManualKickoffEmail}
              onAddManualKickoffEmail={addManualKickoffEmail}
              onSendKickoff={sendKickoff}
              onDepartmentAttendeeChange={setDepartmentAttendee}
              onRemoveKickoffAttendee={removeKickoffAttendee}
            />
          ) : null}

          {activeTab === 'blocks' ? (
            <ProjectBlocksTab
              project={project}
              blockDraft={blockDraft}
              taskDraft={taskDraft}
              showBlockComposer={showBlockComposer}
              editingBlockId={editingBlockId}
              expandedBlocks={expandedBlocks}
              quickTaskBlockId={quickTaskBlockId}
              savingBlocks={savingBlocks}
              onSave={saveBlocks}
              onResetBlockDraft={resetBlockDraft}
              onSetBlockDraft={setBlockDraft}
              onCreateBlock={createBlock}
              onSetBlockField={setBlockField}
              onToggleBlockExpanded={toggleBlockExpanded}
              onRemoveBlock={removeBlock}
              onSetEditingBlockId={setEditingBlockId}
              onOpenQuickTaskComposer={openQuickTaskComposer}
              onResetTaskDraft={resetTaskDraft}
              onSetTaskDraftField={setTaskDraftField}
              onAddTaskToBlock={addTaskToBlock}
              onRemoveTask={removeTask}
              departmentResponsibleOptions={departmentResponsibleOptions}
              taskResponsibleOptions={taskResponsibleOptions}
            />
          ) : null}

          {activeTab === 'tasks' ? (
            <ProjectTasksTab
              projectBlocks={project.blocks}
              allTasks={allTasks}
              taskDraft={taskDraft}
              showTaskComposer={showTaskComposer}
              editingTaskKey={editingTaskKey}
              savingBlocks={savingBlocks}
              onSave={saveBlocks}
              onResetTaskDraft={resetTaskDraft}
              onSetTaskDraftField={setTaskDraftField}
              onAddTaskToBlock={addTaskToBlock}
              onSetEditingTaskKey={setEditingTaskKey}
              onRemoveTask={removeTask}
              onSetTaskField={setTaskField}
              taskResponsibleOptions={taskResponsibleOptions}
            />
          ) : null}

          {activeTab === 'documents' ? (
            <ProjectDocumentsTab
              project={project}
              savingOverview={savingOverview}
              onSave={saveOverview}
              onPendingFileChange={setPendingFile}
            />
          ) : null}

          {activeTab === 'rooms' ? <ProjectRoomsTab /> : null}

          {activeTab === 'tracking' ? <ProjectTrackingTab project={project} /> : null}
        </div>
      </section>

      {activeTab === 'blocks' && !showBlockComposer ? (
        <FloatingAddButton onClick={() => setShowBlockComposer(true)} />
      ) : null}

      {activeTab === 'tasks' && !showTaskComposer ? (
        <FloatingAddButton onClick={() => setShowTaskComposer(true)} />
      ) : null}
    </div>
  )
}
