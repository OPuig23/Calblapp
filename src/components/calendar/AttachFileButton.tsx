//file: src/components/calendar/AttachFileButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SharePointPicker from './SharePointFilePicker'
import { Paperclip } from 'lucide-react'

type Props = {
  collection: 'stage_verd' | 'stage_taronja' | 'stage_blau'
  docId: string
  fieldBase?: string // p.ex. "Full_Encarrec_file"
  onAdded?: (att: { name: string; url: string }) => void
}

export default function AttachFileButton({ collection, docId, fieldBase = 'Full_Encarrec_file', onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([])

  async function handleSelected(item: { id: string; name: string; url: string }) {
    setSaving(true)
    try {
      const nextIndex = attachments.length + 1
      const field = `${fieldBase}${nextIndex}` // Full_Encarrec_file1, 2...
      await fetch('/api/calendar/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          docId,
          field,
          attachment: { name: item.name, url: item.url }
        })
      })
      const att = { name: item.name, url: item.url }
      setAttachments(prev => [...prev, att])
      onAdded?.(att)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-full sm:w-auto shadow-sm" onClick={() => setOpen(true)} disabled={saving}>
        <Paperclip className="h-4 w-4 mr-2" />
        Adjuntar fitxer (SharePoint)
      </Button>

      <SharePointPicker open={open} onOpenChange={setOpen} onSelected={handleSelected} />

      {attachments.length > 0 && (
        <ul className="mt-3 space-y-1">
          {attachments.map((a, i) => (
            <li key={i} className="text-sm">
              📄 <a className="underline" href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
