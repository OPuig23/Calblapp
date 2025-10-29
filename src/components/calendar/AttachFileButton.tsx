//file: src/components/calendar/AttachFileButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SharePointPicker from './SharePointFilePicker'
import { Paperclip } from 'lucide-react'

type Props = {
  collection: 'stage_verd' | 'stage_taronja' | 'stage_blau'
  docId: string
  fieldBase?: string // p.ex. "file"
  onAdded?: (att: { name: string; url: string }) => void
}

/**
 * 📎 AttachFileButton
 * - Permet seleccionar fitxers del SharePoint mitjançant el FilePicker
 * - Desa automàticament l’enllaç (file1, file2, ...) a Firestore
 * - Notifica el parent (CalendarModal o NewEventModal) perquè actualitzi la llista visual
 */
export default function AttachFileButton({
  collection,
  docId,
  fieldBase = 'file',
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([])

  /**
   * Troba el proper camp lliure (file1, file2, file3, ...)
   */
  const findNextFileKey = (currentKeys: string[]) => {
    const used = new Set(
      currentKeys
        .filter((k) => k.startsWith(fieldBase))
        .map((k) => parseInt(k.replace(fieldBase, ''), 10))
        .filter((n) => !Number.isNaN(n))
    )
    let i = 1
    while (used.has(i)) i++
    return `${fieldBase}${i}`
  }

  /**
   * Quan l’usuari selecciona un fitxer al SharePointPicker
   */
  async function handleSelected(item: { id: string; name: string; url: string }) {
    setSaving(true)
    try {
      const nextKey = findNextFileKey(attachments.map((_, i) => `${fieldBase}${i + 1}`))

      // Desa a Firestore
      // Desa al Firestore mitjançant l'endpoint nou (App Router)
await fetch(`/api/calendar/manual/${docId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection,
    field: nextKey,
    url: item.url, // només la URL, no l’objecte sencer
  }),
})


      // ✅ Actualitza estat local sense duplicar si ja existeix
// ✅ Només notifica el parent (CalendarModal), no dupliquem estat
onAdded?.({ name: item.name, url: item.url })


    } catch (err) {
      console.error('❌ Error desant fitxer:', err)
      alert('❌ No s’ha pogut desar el fitxer a Firestore.')
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

      {/* Selector SharePoint */}
      <SharePointPicker open={open} onOpenChange={setOpen} onSelected={handleSelected} />

      {/* Fitxers afegits (només visuals locals) */}
      
    </>
  )
}
