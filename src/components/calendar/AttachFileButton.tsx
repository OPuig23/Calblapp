// file: src/components/calendar/AttachFileButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SharePointPicker from './SharePointFilePicker'
import { Paperclip } from 'lucide-react'
import { motion } from 'framer-motion'

type Props = {
  collection: 'stage_verd' | 'stage_taronja' | 'stage_blau'
  docId: string
  disabled?: boolean
  fieldBase?: string
  onAdded?: (att: { name: string; url: string }) => void
}

export default function AttachFileButton({
  collection,
  docId,
  disabled = false,
  fieldBase = 'file',
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attachments] = useState<{ name: string; url: string }[]>([])

  /** 📌 Troba el primer camp disponible: file1, file2, file3... */
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

  /** 📌 Quan l’usuari selecciona un fitxer del picker */
  async function handleSelected(item: { id: string; name: string; url: string }) {
    if (!docId) {
      alert('❌ Cal desar l’esdeveniment abans d’adjuntar documents.')
      return
    }

    setSaving(true)
    try {
      const publicUrl = item.url // ja ve en format vàlid via /api/sharepoint/file

      const nextKey = findNextFileKey(
        attachments.map((_, i) => `${fieldBase}${i + 1}`)
      )

      await fetch(`/api/calendar/manual/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          field: nextKey,
          url: publicUrl,
        }),
      })

      // Notificar al component pare
      onAdded?.({ name: item.name, url: publicUrl })
    } catch (err) {
      console.error('❌ Error desant fitxer:', err)
      alert('❌ No s’ha pogut desar el fitxer.')
    } finally {
      setSaving(false)
    }
  }

  /** 📌 Animació del botó */
  const scaleAnimation = disabled
    ? {}
    : {
        whileTap: { scale: 0.94 },
        whileHover: { scale: 1.02 },
      }

  return (
    <>
      <motion.div {...scaleAnimation}>
        <Button
          size="sm"
          className={`w-full sm:w-auto shadow-sm font-medium flex items-center gap-2
            ${
              disabled
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          disabled={disabled || saving}
          onClick={() => {
            if (!disabled) setOpen(true)
          }}
        >
          <Paperclip className="h-4 w-4" />
          {saving ? 'Desant...' : 'Adjuntar fitxer (SharePoint)'}
        </Button>
      </motion.div>

      <SharePointPicker
        open={open}
        onOpenChange={setOpen}
        onSelected={handleSelected}
      />
    </>
  )
}
