'use client'

import Link from 'next/link'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type ProjectData } from './project-shared'

type Props = {
  project: ProjectData
  savingOverview: boolean
  onSave: () => void
  onPendingFileChange: (file: File | null) => void
}

export default function ProjectDocumentsTab({
  project,
  savingOverview,
  onSave,
  onPendingFileChange,
}: Props) {
  return (
    <div className="space-y-5 rounded-[24px] border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
        <p className="text-sm text-slate-500">Document inicial i repositori del projecte.</p>
      </div>

      {project.document?.url ? (
        <Link
          href={project.document.url}
          target="_blank"
          className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50/40"
        >
          <span>{project.document.name || 'Document del projecte'}</span>
          <span className="text-violet-700">Obrir</span>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
          Encara no hi ha documents.
        </div>
      )}

      <Input type="file" onChange={(event) => onPendingFileChange(event.target.files?.[0] || null)} />

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={savingOverview}>
          <Save className="mr-2 h-4 w-4" />
          Guardar documents
        </Button>
      </div>
    </div>
  )
}
