'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import FloatingAddButton from '@/components/ui/floating-add-button'
import { toast } from '@/components/ui/use-toast'
import { normalizeRole } from '@/lib/roles'
import {
  deriveProjectPhase,
  getBlockDepartments,
  getPreLaunchDeadline,
  type ProjectData,
} from './project-shared'
import ProjectOverviewTab from './ProjectOverviewTab'
import ProjectWorkspaceShell from './ProjectWorkspaceShell'
import {
  deriveKickoffAttendees,
  ensureProjectRooms,
  sameStringSet,
  serializeBlocksState,
  serializeOverviewState,
  serializeRoomsState,
  syncBlockBudgets,
} from './project-workspace-state'
import { useProjectBlocksTasksActions } from './useProjectBlocksTasksActions'
import { useProjectKickoffActions } from './useProjectKickoffActions'
import { useProjectPersistence } from './useProjectPersistence'
import { useProjectRoomsActions } from './useProjectRoomsActions'
import {
  createBlockDraft,
  createTaskDraft,
  normalizeDepartment,
  type ResponsibleOption,
  type WorkspaceTab,
  workspaceTabs,
} from './project-workspace-helpers'

type Props = {
  projectId: string
  initialProject: ProjectData
  initialTab?: WorkspaceTab
}

const tabLoadingFallback = () => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
    Carregant pestanya...
  </div>
)

const ProjectKickoffTab = dynamic(() => import('./ProjectKickoffTab'), {
  loading: tabLoadingFallback,
})

const ProjectBlocksTab = dynamic(() => import('./ProjectBlocksTab'), {
  loading: tabLoadingFallback,
})

const ProjectTasksTab = dynamic(() => import('./ProjectTasksTab'), {
  loading: tabLoadingFallback,
})

const ProjectPlanningTab = dynamic(() => import('./ProjectPlanningTab'), {
  loading: tabLoadingFallback,
})

const ProjectDocumentsTab = dynamic(() => import('./ProjectDocumentsTab'), {
  loading: tabLoadingFallback,
})

const ProjectRoomsTab = dynamic(() => import('./ProjectRoomsTab'), {
  loading: tabLoadingFallback,
})

const ProjectTrackingTab = dynamic(() => import('./ProjectTrackingTab'), {
  loading: tabLoadingFallback,
})

export default function ProjectWorkspace({ projectId, initialProject, initialTab = 'overview' }: Props) {
  const { data: session, status: sessionStatus } = useSession()
  const sessionUserId = String(session?.user?.id || '').trim()
  const sessionUserName = String(session?.user?.name || '').trim()
  const sessionRole = normalizeRole(String(session?.user?.role || '').trim())
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)
  const [project, setProject] = useState<ProjectData>(initialProject)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingDocumentFile, setPendingDocumentFile] = useState<File | null>(null)
  const [documentDraft, setDocumentDraft] = useState({ category: 'general', label: '' })
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
  const [showRoomComposer, setShowRoomComposer] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [editingTaskKey, setEditingTaskKey] = useState<string | null>(null)
  const [quickTaskBlockId, setQuickTaskBlockId] = useState<string | null>(null)
  const [roomDraft, setRoomDraft] = useState({ name: '', departments: [] as string[] })
  const [overviewSavedState, setOverviewSavedState] = useState('')
  const [blocksSavedState, setBlocksSavedState] = useState('')
  const canViewKickoff =
    sessionRole === 'admin' ||
    (sessionUserId && sessionUserId === String(project.createdById || '').trim()) ||
    (sessionUserId && sessionUserId === String(project.ownerUserId || '').trim()) ||
    (sessionUserName && sessionUserName === String(project.owner || '').trim())

  useEffect(() => {
    setOverviewSavedState(serializeOverviewState(initialProject))
    setBlocksSavedState(serializeBlocksState(initialProject))
  }, [initialProject])

  useEffect(() => {
    if (sessionStatus !== 'loading' && activeTab === 'kickoff' && !canViewKickoff) {
      setActiveTab('overview')
    }
  }, [activeTab, canViewKickoff, sessionStatus])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/users?view=project-options', { cache: 'no-store' })
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
  const maxDeadline = useMemo(() => getPreLaunchDeadline(project.launchDate), [project.launchDate])
  const projectOverviewState = useMemo(() => serializeOverviewState(project), [project])
  const projectBlocksState = useMemo(() => serializeBlocksState(project), [project])
  const userByName = useMemo(
    () => new Map(usersCatalog.map((user) => [user.name, user])),
    [usersCatalog]
  )
  const kickoffAttendeeOptions = useMemo(
    () =>
      usersCatalog.filter(
        (user) =>
          Boolean(user.email) &&
          !project.kickoff.attendees.some((item) => item.key === `user:${user.id}`)
      ),
    [usersCatalog, project.kickoff.attendees]
  )
  const allTasks = useMemo(
    () =>
      project.blocks.flatMap((block) =>
        block.tasks.map((task) => ({
          block,
          task,
          taskKey: `${block.id}:${task.id}`,
        }))
      ),
    [project.blocks]
  )
  const visibleTabs = useMemo<WorkspaceTab[]>(
    () =>
      sessionStatus === 'loading'
        ? workspaceTabs.map((tab) => tab.id)
        :
      canViewKickoff
        ? ['overview', 'kickoff', 'blocks', 'tasks', 'rooms', 'planning', 'tracking', 'documents']
        : ['overview', 'blocks', 'tasks', 'rooms', 'planning', 'tracking', 'documents'],
    [canViewKickoff, sessionStatus]
  )
  const dirtyOverview = overviewSavedState !== projectOverviewState || Boolean(pendingFile)
  const dirtyBlocks = blocksSavedState !== projectBlocksState
  const { saveProject, syncRoomsWithOps } = useProjectPersistence({
    projectId,
    pendingFile,
    setPendingFile,
    setProject,
  })
  const {
    resetRoomDraft,
    toggleRoomDraftDepartment,
    createManualRoom,
    removeRoom,
  } = useProjectRoomsActions({
    project,
    roomDraft,
    setRoomDraft,
    setShowRoomComposer,
    setProject,
    setSavingBlocks,
    saveProject,
    syncRoomsWithOps,
    userByName,
  })
  const {
    setKickoffField,
    removeKickoffAttendee,
    setKickoffAttendeeAttendance,
    addManualKickoffEmail,
    kickoffReady,
    sendKickoff,
    finalizeKickoffMinutes,
    reopenKickoffMinutes,
  } = useProjectKickoffActions({
    projectId,
    project,
    setProject,
    manualKickoffEmail,
    setManualKickoffEmail,
    setSendingKickoff,
    setSavingBlocks,
    saveProject,
    ensureProjectRooms: (currentProject) => ensureProjectRooms(currentProject, userByName),
    sessionUserName: String(session?.user?.name || ''),
    onKickoffMinutesSaved: (nextProject) => setBlocksSavedState(serializeBlocksState(nextProject)),
  })
  const {
    createBlock,
    setBlockField,
    removeBlock,
    setTaskDraftField,
    addTaskToBlock,
    setTaskField,
    removeTask,
    attachTaskDocument,
    removeTaskDocument,
    resetTaskDraft,
    openQuickTaskComposer,
    resetBlockDraft,
    addDepartmentToBlock,
    removeDepartmentFromBlock,
  } = useProjectBlocksTasksActions({
    project,
    blockDraft,
    taskDraft,
    setProject,
    setBlockDraft,
    setTaskDraft,
    setShowBlockComposer,
    setShowTaskComposer,
    setQuickTaskBlockId,
    setEditingBlockId,
    setSavingBlocks,
    saveProject,
    ensureProjectRooms: (currentProject) => ensureProjectRooms(currentProject, userByName),
    onBlocksStateSaved: (nextProject) => setBlocksSavedState(serializeBlocksState(nextProject)),
  })

  const departmentResponsibleOptions = (department?: string | string[]) => {
    const departments = Array.isArray(department) ? department : [department || '']
    const normalizedDepartments = departments
      .map((item) => normalizeDepartment(item || ''))
      .filter(Boolean)

    if (normalizedDepartments.length === 0) return ownerOptions

    const filtered = responsibles.filter(
      (user) =>
        user.role === 'cap' &&
        normalizedDepartments.includes(normalizeDepartment(user.department || ''))
    )

    return filtered.length > 0 ? filtered : ownerOptions
  }

  const taskResponsibleOptions = (department?: string) => {
    const normalized = normalizeDepartment(department || '')
    if (!normalized) return ownerOptions

    const filtered = usersCatalog.filter(
      (user) => normalizeDepartment(user.department || '') === normalized
    )

    return filtered.length > 0 ? filtered : departmentResponsibleOptions(department)
  }

  useEffect(() => {
    setProject((current) => {
      const next = ensureProjectRooms(current, userByName)
      const currentRoomsState = serializeRoomsState(current.rooms)
      const nextRoomsState = serializeRoomsState(next.rooms)
      if (nextRoomsState === currentRoomsState) return current
      return next
    })
  }, [project.owner, project.blocks, userByName])

  useEffect(() => {
    setProject((current) => {
      const dedupedAttendees = deriveKickoffAttendees(current, usersCatalog, userByName)

      const same =
        dedupedAttendees.length === current.kickoff.attendees.length &&
        dedupedAttendees.every((item, index) => {
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
          attendees: dedupedAttendees,
        },
      }
    })
  }, [usersCatalog, project.departments, project.owner, project.sponsor, userByName])

  useEffect(() => {
    setProject((current) => {
      const next = syncBlockBudgets(current)
      const same = next.blocks.every((block, index) => block.budget === current.blocks[index]?.budget)
      return same ? current : next
    })
  }, [project.blocks])

  useEffect(() => {
    setProject((current) => {
      const nextPhase = deriveProjectPhase(current)
      if (current.phase === nextPhase && !current.status) return current
      return {
        ...current,
        phase: nextPhase,
        status: '',
      }
    })
  }, [project.blocks, project.kickoff.attendees.length, project.kickoff.date, project.kickoff.startTime, project.kickoff.status])

  useEffect(() => {
    setProject((current) => {
      const nextDepartments = [
        ...new Set(
          current.blocks.flatMap((block) => getBlockDepartments(block)).filter(Boolean)
        ),
      ]

      if (sameStringSet(current.departments, nextDepartments)) {
        return current
      }

      return {
        ...current,
        departments: nextDepartments,
      }
    })
  }, [project.blocks])

  const saveOverview = async () => {
    try {
      setSavingOverview(true)
      const nextProject = ensureProjectRooms(project, userByName)
      setProject(nextProject)
      const storedDocument = await saveProject('Projecte guardat', nextProject)
      const finalProject =
        storedDocument && pendingFile
          ? {
              ...nextProject,
              document: storedDocument,
              documents: [...nextProject.documents, storedDocument],
            }
          : nextProject
      await syncRoomsWithOps(finalProject)
      setOverviewSavedState(serializeOverviewState(finalProject))
      setBlocksSavedState(serializeBlocksState(finalProject))
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
      const timestamp = new Date().toISOString()
      const nextProject = ensureProjectRooms({
        ...project,
        kickoff: {
          ...project.kickoff,
          minutesAuthor: String(project.kickoff.minutes || '').trim()
            ? String(session?.user?.name || '').trim()
            : project.kickoff.minutesAuthor,
          minutesUpdatedAt: String(project.kickoff.minutes || '').trim()
            ? timestamp
            : project.kickoff.minutesUpdatedAt,
        },
      }, userByName)
      setProject(nextProject)
      await saveProject('Blocs guardats', nextProject)
      await syncRoomsWithOps(nextProject)
      setBlocksSavedState(serializeBlocksState(nextProject))
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

  const saveDocuments = async () => {
    const hasFile = Boolean(pendingDocumentFile)
    if (!hasFile) return

    try {
      setSavingOverview(true)
      await saveProject('Document guardat', project, {
        file: pendingDocumentFile,
        fileCategory: documentDraft.category,
        fileLabel: documentDraft.label.trim() || pendingDocumentFile.name,
        onUploaded: (stored) => {
          setProject((current) => ({
            ...current,
            documents: [...current.documents, stored],
          }))
        },
      })

      setPendingDocumentFile(null)
      setDocumentDraft({ category: 'general', label: '' })
    } catch (err: unknown) {
      toast({
        title: 'Error guardant el document',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingOverview(false)
    }
  }

  const removeDocument = async (
    documentId: string,
    source?: { type: 'project' | 'room' | 'task'; roomId?: string; blockId?: string; taskId?: string }
  ) => {
    let nextProject = project

    if (!source || source.type === 'project') {
      const remainingDocuments = project.documents.filter((item) => item?.id !== documentId)
      const nextPrimaryDocument =
        project.document?.id === documentId
          ? remainingDocuments.find((item) => item?.category === 'initial') || null
          : project.document

      nextProject = {
        ...project,
        documents: remainingDocuments,
        document: nextPrimaryDocument,
      }
    } else if (source.type === 'room' && source.roomId) {
      nextProject = {
        ...project,
        rooms: project.rooms.map((room) =>
          room.id === source.roomId
            ? {
                ...room,
                documents: (room.documents || []).filter((item) => item?.id !== documentId),
              }
            : room
        ),
      }
    } else if (source.type === 'task' && source.blockId && source.taskId) {
      nextProject = {
        ...project,
        blocks: project.blocks.map((block) =>
          block.id === source.blockId
            ? {
                ...block,
                tasks: block.tasks.map((task) =>
                  task.id === source.taskId
                    ? {
                        ...task,
                        documents: (task.documents || []).filter((item) => item?.id !== documentId),
                      }
                    : task
                ),
              }
            : block
        ),
      }
    }

    setProject(nextProject)

    try {
      setSavingOverview(true)
      await saveProject('Document eliminat', nextProject)
      setOverviewSavedState(serializeOverviewState(nextProject))
    } catch (err: unknown) {
      toast({
        title: 'Error eliminant el document',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingOverview(false)
    }
  }

  const removeKickoffMinutes = async () => {
    const nextProject = {
      ...project,
      kickoff: {
        ...project.kickoff,
        minutes: '',
      },
    }

    setProject(nextProject)

    try {
      setSavingOverview(true)
      await saveProject('Acta eliminada', nextProject)
    } catch (err: unknown) {
      toast({
        title: 'Error eliminant l acta',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingOverview(false)
    }
  }

  return (
    <div className="space-y-6">
      <ProjectWorkspaceShell
        project={project}
        activeTab={activeTab}
        visibleTabs={visibleTabs}
        onTabChange={setActiveTab}
      />

      <section className="rounded-[28px] border border-violet-200 bg-white shadow-sm">
        <div className="p-6">
          {activeTab === 'overview' ? (
            <ProjectOverviewTab
              project={project}
              ownerOptions={ownerOptions}
              pendingFile={pendingFile}
              blockDraft={blockDraft}
              dirtyOverview={dirtyOverview}
              savingOverview={savingOverview}
              showBlockComposer={showBlockComposer}
              onSave={saveOverview}
              onProjectChange={setProject}
              onPendingFileChange={setPendingFile}
              onSetBlockDraftName={(value) =>
                setBlockDraft((current) => ({ ...current, name: value }))
              }
              onToggleBlockComposer={() =>
                setShowBlockComposer((current) => {
                  if (current) setBlockDraft(createBlockDraft())
                  return !current
                })
              }
              onCreateBlock={createBlock}
              onSetBlockName={(blockId, value) => setBlockField(blockId, 'name', value)}
              onAddDepartmentToBlock={addDepartmentToBlock}
              onRemoveDepartmentFromBlock={removeDepartmentFromBlock}
              onRemoveBlock={removeBlock}
              onRemoveDocument={removeDocument}
            />
          ) : null}

          {activeTab === 'kickoff' && canViewKickoff ? (
            <ProjectKickoffTab
              project={project}
              manualKickoffEmail={manualKickoffEmail}
              kickoffReady={kickoffReady}
              sendingKickoff={sendingKickoff}
              onKickoffFieldChange={setKickoffField}
              onManualKickoffEmailChange={setManualKickoffEmail}
              onAddManualKickoffEmail={addManualKickoffEmail}
              onSendKickoff={sendKickoff}
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
              quickTaskBlockId={quickTaskBlockId}
              savingBlocks={savingBlocks}
              dirtyBlocks={dirtyBlocks}
              onSave={saveBlocks}
              onResetBlockDraft={resetBlockDraft}
              onSetBlockDraft={setBlockDraft}
              onCreateBlock={createBlock}
              onSetBlockField={setBlockField}
              onRemoveBlock={removeBlock}
              onSetEditingBlockId={setEditingBlockId}
              onOpenQuickTaskComposer={openQuickTaskComposer}
              onResetTaskDraft={resetTaskDraft}
              onSetTaskDraftField={setTaskDraftField}
              onAddTaskToBlock={addTaskToBlock}
              onSetTaskField={setTaskField}
              onRemoveTask={removeTask}
              onKickoffMinutesChange={(value) =>
                setProject((current) => ({
                  ...current,
                  kickoff: {
                    ...current.kickoff,
                    minutes: value,
                  },
                }))
              }
              onFinalizeKickoffMinutes={finalizeKickoffMinutes}
              onReopenKickoffMinutes={reopenKickoffMinutes}
              onKickoffAttendeeAttendanceChange={setKickoffAttendeeAttendance}
              onAddKickoffAttendee={(userId) => {
                const user = usersCatalog.find((item) => item.id === userId && item.email)
                if (!user) return
                setProject((current) => {
                  if (current.kickoff.attendees.some((item) => item.key === `user:${user.id}`)) {
                    return current
                  }
                  return {
                    ...current,
                    kickoff: {
                      ...current.kickoff,
                      excludedKeys: current.kickoff.excludedKeys.filter(
                        (item) => item !== `user:${user.id}`
                      ),
                      attendees: [
                        ...current.kickoff.attendees,
                        {
                          key: `user:${user.id}`,
                          userId: user.id,
                          name: user.name,
                          email: user.email,
                          department: user.department || 'Manual',
                          attended: true,
                        },
                      ],
                    },
                  }
                })
              }}
              onRemoveKickoffAttendee={removeKickoffAttendee}
              kickoffAttendeeOptions={kickoffAttendeeOptions}
              departmentResponsibleOptions={departmentResponsibleOptions}
              maxDeadline={maxDeadline}
            />
          ) : null}

          {activeTab === 'tasks' ? (
            <ProjectTasksTab
              projectId={projectId}
              projectBlocks={project.blocks}
              projectRooms={project.rooms}
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
              onAttachTaskDocument={attachTaskDocument}
              onRemoveTaskDocument={removeTaskDocument}
              taskResponsibleOptions={taskResponsibleOptions}
              maxDeadline={maxDeadline}
            />
          ) : null}

          {activeTab === 'planning' ? (
            <ProjectPlanningTab projectId={projectId} project={project} />
          ) : null}

          {activeTab === 'documents' ? (
            <ProjectDocumentsTab
              project={project}
              savingOverview={savingOverview}
              pendingDocumentFile={pendingDocumentFile}
              documentDraft={documentDraft}
              onSave={saveDocuments}
              onPendingFileChange={setPendingDocumentFile}
              onDocumentDraftChange={setDocumentDraft}
              onRemoveDocument={removeDocument}
              onRemoveKickoffMinutes={removeKickoffMinutes}
            />
          ) : null}

          {activeTab === 'rooms' ? (
            <ProjectRoomsTab
              projectId={projectId}
              rooms={project.rooms}
              roomDraft={roomDraft}
              showRoomComposer={showRoomComposer}
              saving={savingBlocks}
              availableDepartments={project.departments}
              onSetRoomDraft={setRoomDraft}
              onToggleRoomDraftDepartment={toggleRoomDraftDepartment}
              onCreateRoom={createManualRoom}
              onResetRoomDraft={resetRoomDraft}
              onRemoveRoom={removeRoom}
            />
          ) : null}

          {activeTab === 'tracking' ? <ProjectTrackingTab project={project} /> : null}
        </div>
      </section>

      {activeTab === 'blocks' && !showBlockComposer ? (
        <FloatingAddButton onClick={() => setShowBlockComposer(true)} />
      ) : null}

      {activeTab === 'tasks' ? (
        <FloatingAddButton
          onClick={() => {
            if (showTaskComposer) {
              setTaskDraft(createTaskDraft())
              setShowTaskComposer(false)
            } else {
              setTaskDraft(createTaskDraft())
              setShowTaskComposer(true)
            }
          }}
        />
      ) : null}

      {activeTab === 'rooms' && !showRoomComposer ? (
        <FloatingAddButton onClick={() => setShowRoomComposer(true)} />
      ) : null}
    </div>
  )
}
