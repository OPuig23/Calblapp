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
  disabled?: boolean  // ← afegit!
}


/**
 * 🔗 Converteix qualsevol URL de SharePoint en un enllaç públic vàlid.
 * Garantim que el document s’obrirà en mòbil sense login.
 */
function toPublicSharePointLink(originalUrl: string): string {
  if (!originalUrl) return ''

  // Si ja és un link públic, no fem res
  if (originalUrl.includes('/:b:/')) return originalUrl

  try {
    const url = new URL(originalUrl)

    // Extreu la ruta després de /sites/EsdevenimentsCalBlay/
    const parts = url.pathname.split('/sites/EsdevenimentsCalBlay/')
    if (parts.length < 2) return originalUrl

    const rel = parts[1] // ruta relativa al fitxer
    return `https://calblayrest.sharepoint.com/:b:/s/EsdevenimentsCalBlay/${rel}`
  } catch {
    return originalUrl
  }
}

export default function AttachFileButton({
  collection,
  docId,
  fieldBase = 'file',
  onAdded,
  disabled,
  }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments] = useState<{ name: string; url: string }[]>([])

  /**
   * Troba el proper fileN
   */
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

  /**
   * Quan s’ha seleccionat un fitxer del SharePointPicker
   */
  async function handleSelected(item: { id: string; name: string; url: string }) {
    setSaving(true)
    try {
      // Convertir a enllaç públic
      const publicUrl = toPublicSharePointLink(item.url)



      // Assignar proper camp: file1, file2...
      const nextKey = findNextFileKey(attachments.map((_, i) => `${fieldBase}${i + 1}`))

      // Desa a Firestore
   await fetch(`/api/calendar/manual/${docId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    collection: `stage_verd`, // 🔥 Sempre en aquesta col·lecció
    field: nextKey,
    url: publicUrl,
  }),
})


      // Notifica el parent
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
  disabled={saving || disabled}   // 👈 CORRECTE
>

        <Paperclip className="h-4 w-4 mr-2" />
        Adjuntar fitxer (SharePoint)
      </Button>

      <SharePointPicker open={open} onOpenChange={setOpen} onSelected={handleSelected} />
    </>
  )
}
