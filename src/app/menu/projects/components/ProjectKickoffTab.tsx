'use client'

import Link from 'next/link'
import { MailPlus, Trash2 } from 'lucide-react'
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
import { type KickoffAttendee, type ProjectData } from './project-shared'
import { projectEmptyStateClass, projectSectionTitleClass } from './project-ui'

type Props = {
  project: ProjectData
  manualKickoffEmail: string
  kickoffReady: boolean
  sendingKickoff: boolean
  onKickoffFieldChange: <K extends keyof ProjectData['kickoff']>(
    field: K,
    value: ProjectData['kickoff'][K]
  ) => void
  onManualKickoffEmailChange: (value: string) => void
  onAddManualKickoffEmail: () => void
  onSendKickoff: () => void
  onRemoveKickoffAttendee: (key: string) => void
}

export default function ProjectKickoffTab({
  project,
  manualKickoffEmail,
  kickoffReady,
  sendingKickoff,
  onKickoffFieldChange,
  onManualKickoffEmailChange,
  onAddManualKickoffEmail,
  onSendKickoff,
  onRemoveKickoffAttendee,
}: Props) {
  const kickoffMinDate =
    typeof project.createdAt === 'number' && project.createdAt > 0
      ? new Date(project.createdAt).toISOString().slice(0, 10)
      : undefined

  return (
    <div className="grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]">
      <section className="space-y-5 rounded-[24px] bg-white/75 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className={projectSectionTitleClass}>Kickoff</h2>
          <div className="flex flex-col items-end gap-2">
            {project.kickoff.graphWebLink ? (
              <Link
                href={project.kickoff.graphWebLink}
                target="_blank"
                className="text-sm font-medium text-violet-700 hover:text-violet-800"
              >
                Obrir Outlook
              </Link>
            ) : null}
            <Button
              type="button"
              onClick={onSendKickoff}
              disabled={!kickoffReady || sendingKickoff}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <MailPlus className="mr-2 h-4 w-4" />
              Enviar convocatoria
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={project.kickoff.date}
              min={kickoffMinDate}
              onChange={(event) => onKickoffFieldChange('date', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input
              type="time"
              value={project.kickoff.startTime}
              onChange={(event) => onKickoffFieldChange('startTime', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Duracio</Label>
            <Select
              value={String(project.kickoff.durationMinutes || 60)}
              onValueChange={(value) => onKickoffFieldChange('durationMinutes', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[30, 45, 60, 90, 120].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes convocatoria</Label>
          <Textarea
            value={project.kickoff.notes}
            onChange={(event) => onKickoffFieldChange('notes', event.target.value)}
            className="min-h-[180px]"
            placeholder="Context, abast i punts a revisar"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-[24px] bg-slate-50/80 p-5">
        <h2 className={projectSectionTitleClass}>Assistents</h2>

        <div className="rounded-[22px] bg-white/90 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Per a</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.kickoff.attendees.length > 0 ? (
              project.kickoff.attendees.map((item: KickoffAttendee) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                >
                  <span className="max-w-[240px] truncate">
                    {item.name} · {item.email}
                  </span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => onRemoveKickoffAttendee(item.key)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            ) : (
              <span className={projectEmptyStateClass}>Encara no hi ha assistents.</span>
            )}
          </div>
        </div>

        <div className="rounded-[22px] bg-white/90 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Afegir email</div>
          <div className="mt-3 flex gap-3">
            <Input
              value={manualKickoffEmail}
              onChange={(event) => onManualKickoffEmailChange(event.target.value)}
              placeholder="nom@empresa.com"
            />
            <Button type="button" variant="outline" onClick={onAddManualKickoffEmail}>
              Afegir
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
