// file: src/components/calendar/AttachFileButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SharePointPicker from './SharePointFilePicker'
import { Paperclip } from 'lucide-react'

type Props = {
  collection: 'stage_verd' | 'stage_taronja' | 'stage_blau'
  docId: string
  fieldBase?: string
  onAdded?: (att: { name: string; url: string }) => void
}

export default function AttachFileButton({
  collection,
  docId,
  fieldBase = 'file',
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [attachments] = useState<{ name: string; url: string }[]>([])

  /** Troba el proper fileN */
  const findNextFileKey = (currentKeys: string[]) => {
    const used = new Set(
      currentKeys
        .filter((k) => k.startsWith(fieldBase))
        .map((k) => parseInt(k.replace(fieldBase, ''), 10))
        .filter((n) => !Number.isNaN(n)),
    )
    let i = 1
    while (used.has(i)) i++
    return `${fieldBase}${i}`
  }

  /** Quan l’usuari tria un fitxer */
  async function handleSelected(item: { id: string; name: string; url: string }) {
    setSaving(true)
    try {
      // 🔵 item.url → ja és link públic via /api/sharepoint/file?itemId=...
      const publicUrl = item.url

      // Trobar camp disponible (file1, file2, file3...)
      const nextKey = findNextFileKey(attachments.map((_, i) => `${fieldBase}${i + 1}`))

      // Desa a Firestore via API interna
      await fetch(`/api/calendar/manual/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          field: nextKey,
          url: publicUrl,
        }),
      })

      // Avisa al component pare
      onAdded?.({ name: item.name, url: publicUrl })
    } catch (err) {
      console.error('❌ Error desant fitxer:', err)
      alert('❌ No s’ha pogut desar el fitxer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium w-full sm:w-auto shadow-sm"
        onClick={() => setOpen(true)}
        disabled={saving}
      >
        <Paperclip className="h-4 w-4 mr-2" />
        Adjuntar fitxer (SharePoint)
      </Button>

      <SharePointPicker open={open} onOpenChange={setOpen} onSelected={handleSelected} />
    </>
  )
}
