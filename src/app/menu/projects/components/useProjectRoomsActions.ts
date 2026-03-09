'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from '@/components/ui/use-toast'
import { buildParticipantDetails } from './project-workspace-state'
import type { ProjectData } from './project-shared'
import type { ResponsibleOption } from './project-workspace-helpers'

type RoomDraft = {
  name: string
  departments: string[]
}

type Params = {
  project: ProjectData
  roomDraft: RoomDraft
  setRoomDraft: Dispatch<SetStateAction<RoomDraft>>
  setShowRoomComposer: Dispatch<SetStateAction<boolean>>
  setProject: Dispatch<SetStateAction<ProjectData>>
  setSavingBlocks: Dispatch<SetStateAction<boolean>>
  saveProject: (
    title: string,
    sourceProject: ProjectData,
    options?: {
      sections?: Array<'overview' | 'departments' | 'blocks' | 'rooms' | 'documents' | 'kickoff'>
    }
  ) => Promise<unknown>
  syncRoomsWithOps: (sourceProject: ProjectData, roomIds?: string[]) => Promise<void>
  userByName: Map<string, ResponsibleOption>
}

export function useProjectRoomsActions({
  project,
  roomDraft,
  setRoomDraft,
  setShowRoomComposer,
  setProject,
  setSavingBlocks,
  saveProject,
  syncRoomsWithOps,
  userByName,
}: Params) {
  const resetRoomDraft = useCallback(() => {
    setRoomDraft({ name: '', departments: [] })
    setShowRoomComposer(false)
  }, [setRoomDraft, setShowRoomComposer])

  const toggleRoomDraftDepartment = useCallback(
    (department: string) => {
      setRoomDraft((current) => ({
        ...current,
        departments: current.departments.includes(department)
          ? current.departments.filter((item) => item !== department)
          : [...current.departments, department],
      }))
    },
    [setRoomDraft]
  )

  const createManualRoom = useCallback(async () => {
    const name = roomDraft.name.trim()
    if (!name) return

    const nextProject = {
      ...project,
      rooms: [
        ...project.rooms,
        {
          id: `room-manual-${Date.now()}`,
          name,
          kind: 'manual' as const,
          opsChannelId: '',
          opsChannelName: name,
          opsChannelSource: 'projects' as const,
          opsSyncedAt: 0,
          departments: roomDraft.departments,
          participants: project.owner ? [project.owner] : [],
          participantDetails: buildParticipantDetails(project.owner ? [project.owner] : [], userByName),
          notes: '',
          documents: [],
        },
      ],
    }

    setProject(nextProject)
    resetRoomDraft()

    try {
      setSavingBlocks(true)
      await saveProject('Sala guardada', nextProject, {
        sections: ['rooms'],
      })
      await syncRoomsWithOps(nextProject, [nextProject.rooms[nextProject.rooms.length - 1].id])
    } catch (err: unknown) {
      toast({
        title: 'Error guardant la sala',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingBlocks(false)
    }
  }, [
    project,
    resetRoomDraft,
    roomDraft.departments,
    roomDraft.name,
    saveProject,
    setProject,
    setSavingBlocks,
    syncRoomsWithOps,
    userByName,
  ])

  const removeRoom = useCallback(async (roomId: string) => {
    const room = project.rooms.find((item) => item.id === roomId)
    if (!room || room.kind === 'block') return

    const nextProject = {
      ...project,
      rooms: project.rooms.filter((item) => item.id !== roomId),
    }

    setProject(nextProject)

    try {
      setSavingBlocks(true)
      await saveProject('Sala eliminada', nextProject, {
        sections: ['rooms'],
      })
    } catch (err: unknown) {
      toast({
        title: 'Error eliminant la sala',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingBlocks(false)
    }
  }, [project, saveProject, setProject, setSavingBlocks])

  return {
    resetRoomDraft,
    toggleRoomDraftDepartment,
    createManualRoom,
    removeRoom,
  }
}
