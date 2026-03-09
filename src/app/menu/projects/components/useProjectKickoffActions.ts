'use client'

import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react'
import { toast } from '@/components/ui/use-toast'
import { deriveProjectPhase, type ProjectData } from './project-shared'

type Params = {
  projectId: string
  project: ProjectData
  setProject: Dispatch<SetStateAction<ProjectData>>
  manualKickoffEmail: string
  setManualKickoffEmail: Dispatch<SetStateAction<string>>
  setSendingKickoff: Dispatch<SetStateAction<boolean>>
  setSavingBlocks: Dispatch<SetStateAction<boolean>>
  saveProject: (title: string, sourceProject: ProjectData) => Promise<unknown>
  ensureProjectRooms: (currentProject: ProjectData) => ProjectData
  sessionUserName?: string
  onKickoffMinutesSaved?: (project: ProjectData) => void
}

export function useProjectKickoffActions({
  projectId,
  project,
  setProject,
  manualKickoffEmail,
  setManualKickoffEmail,
  setSendingKickoff,
  setSavingBlocks,
  saveProject,
  ensureProjectRooms,
  sessionUserName,
  onKickoffMinutesSaved,
}: Params) {
  const setKickoffField = useCallback(
    <K extends keyof ProjectData['kickoff']>(field: K, value: ProjectData['kickoff'][K]) => {
      setProject((current) => ({
        ...current,
        kickoff: {
          ...current.kickoff,
          [field]: value,
        },
      }))
    },
    [setProject]
  )

  const removeKickoffAttendee = useCallback((key: string) => {
    setProject((current) => {
      const isManualAttendee = key.startsWith('manual:')
      return {
        ...current,
        kickoff: {
          ...current.kickoff,
          excludedKeys: isManualAttendee
            ? current.kickoff.excludedKeys.filter((item) => item !== key)
            : Array.from(new Set([...current.kickoff.excludedKeys, key])),
          attendees: current.kickoff.attendees.filter((item) => item.key !== key),
        },
      }
    })
  }, [setProject])

  const setKickoffAttendeeAttendance = useCallback((key: string, attended: boolean) => {
    setProject((current) => ({
      ...current,
      kickoff: {
        ...current.kickoff,
        attendees: current.kickoff.attendees.map((item) =>
          item.key === key ? { ...item, attended } : item
        ),
      },
    }))
  }, [setProject])

  const addManualKickoffEmail = useCallback(() => {
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
  }, [manualKickoffEmail, setManualKickoffEmail, setProject])

  const kickoffReady = useMemo(
    () =>
      Boolean(project.kickoff.date) &&
      Boolean(project.kickoff.startTime) &&
      Number(project.kickoff.durationMinutes) > 0 &&
      project.kickoff.attendees.some((item) => item.email.includes('@')),
    [project.kickoff.attendees, project.kickoff.date, project.kickoff.durationMinutes, project.kickoff.startTime]
  )

  const sendKickoff = useCallback(async () => {
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
        warning?: string
      }
      if (!res.ok || !payload.kickoff) {
        throw new Error(payload.error || 'No s ha pogut crear la convocatoria')
      }

      setProject((current) => ({
        ...current,
        phase: deriveProjectPhase({
          ...current,
          kickoff: {
            ...current.kickoff,
            ...payload.kickoff,
          },
        }),
        status: '',
        kickoff: {
          ...current.kickoff,
          ...payload.kickoff,
        },
      }))

      toast({
        title: payload.warning ? 'Convocatoria creada amb avis' : 'Convocatoria enviada',
        description: payload.warning || undefined,
        variant: payload.warning ? 'destructive' : 'default',
      })
    } catch (err: unknown) {
      toast({
        title: 'Error enviant la convocatoria',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSendingKickoff(false)
    }
  }, [project.kickoff.attendees, project.kickoff.date, project.kickoff.durationMinutes, project.kickoff.notes, project.kickoff.startTime, projectId, setProject, setSendingKickoff])

  const finalizeKickoffMinutes = useCallback(async () => {
    try {
      setSavingBlocks(true)
      const timestamp = new Date().toISOString()
      const nextProject = ensureProjectRooms({
        ...project,
        kickoff: {
          ...project.kickoff,
          minutesStatus: 'closed',
          minutesAuthor: String(sessionUserName || '').trim(),
          minutesClosedAt: project.kickoff.minutesClosedAt || timestamp,
          minutesUpdatedAt: timestamp,
        },
      })
      setProject(nextProject)
      await saveProject('Acta finalitzada', nextProject)
      onKickoffMinutesSaved?.(nextProject)
    } catch (err: unknown) {
      toast({
        title: 'Error finalitzant l acta',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingBlocks(false)
    }
  }, [ensureProjectRooms, onKickoffMinutesSaved, project, saveProject, sessionUserName, setProject, setSavingBlocks])

  const reopenKickoffMinutes = useCallback(async () => {
    try {
      setSavingBlocks(true)
      const timestamp = new Date().toISOString()
      const nextProject = ensureProjectRooms({
        ...project,
        kickoff: {
          ...project.kickoff,
          minutesStatus: 'open',
          minutesUpdatedAt: timestamp,
        },
      })
      setProject(nextProject)
      await saveProject('Acta reoberta', nextProject)
      onKickoffMinutesSaved?.(nextProject)
    } catch (err: unknown) {
      toast({
        title: 'Error reobrint l acta',
        description: err instanceof Error ? err.message : 'Error inesperat',
        variant: 'destructive',
      })
    } finally {
      setSavingBlocks(false)
    }
  }, [ensureProjectRooms, onKickoffMinutesSaved, project, saveProject, setProject, setSavingBlocks])

  return {
    setKickoffField,
    removeKickoffAttendee,
    setKickoffAttendeeAttendance,
    addManualKickoffEmail,
    kickoffReady,
    sendKickoff,
    finalizeKickoffMinutes,
    reopenKickoffMinutes,
  }
}
