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
import { type ResponsibleOption } from './project-workspace-helpers'

type DepartmentHeadEntry = {
  department: string
  options: ResponsibleOption[]
}

type Props = {
  project: ProjectData
  manualKickoffEmail: string
  departmentHeadOptions: DepartmentHeadEntry[]
  kickoffReady: boolean
  sendingKickoff: boolean
  onKickoffFieldChange: <K extends keyof ProjectData['kickoff']>(
    field: K,
    value: ProjectData['kickoff'][K]
  ) => void
  onManualKickoffEmailChange: (value: string) => void
  onAddManualKickoffEmail: () => void
  onSendKickoff: () => void
  onDepartmentAttendeeChange: (department: string, userId: string) => void
  onRemoveKickoffAttendee: (key: string) => void
}

export default function ProjectKickoffTab({
  project,
  manualKickoffEmail,
  departmentHeadOptions,
  kickoffReady,
  sendingKickoff,
  onKickoffFieldChange,
  onManualKickoffEmailChange,
  onAddManualKickoffEmail,
  onSendKickoff,
  onDepartmentAttendeeChange,
  onRemoveKickoffAttendee,
}: Props) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[0.85fr_1.15fr]">
      <section className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Convocatoria kickoff</h2>
          <p className="text-sm text-slate-500">
            Programa la reunio d arrencada i envia-la per Outlook.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={project.kickoff.date}
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
            className="min-h-[160px]"
            placeholder="Context, abast i punts a revisar"
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Label>Altres direccions d email</Label>
          <div className="flex gap-3">
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          La convocatoria es creara a Outlook i s enviara per email als assistents.
        </div>

        {project.kickoff.graphWebLink ? (
          <Link
            href={project.kickoff.graphWebLink}
            target="_blank"
            className="text-sm font-medium text-violet-700"
          >
            Obrir convocatoria Outlook
          </Link>
        ) : null}

        <Button type="button" className="w-full" disabled={!kickoffReady || sendingKickoff} onClick={onSendKickoff}>
          <MailPlus className="mr-2 h-4 w-4" />
          Enviar convocatoria
        </Button>
      </section>

      <section className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assistents</h2>
          <p className="text-sm text-slate-500">
            Responsable del projecte, caps de departament i emails afegits.
          </p>
        </div>

        {departmentHeadOptions.map((entry) =>
          entry.options.length > 1 ? (
            <div key={entry.department} className="space-y-2 rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-900">{entry.department}</div>
              <Select
                value={
                  project.kickoff.attendees.find(
                    (item) => item.key === `department:${entry.department}`
                  )?.userId || undefined
                }
                onValueChange={(value) => onDepartmentAttendeeChange(entry.department, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tria responsable" />
                </SelectTrigger>
                <SelectContent>
                  {entry.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} · {option.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        )}

        {project.kickoff.attendees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            Encara no hi ha cap assistent.
          </div>
        ) : (
          <div className="space-y-3">
            {project.kickoff.attendees.map((item: KickoffAttendee) => (
              <div
                key={item.key}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-500">
                    {item.department} · {item.email}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onRemoveKickoffAttendee(item.key)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Treure
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
