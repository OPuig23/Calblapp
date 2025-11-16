// file: src/components/shared/SharePointFilePicker.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Folder, FileText, ArrowLeft, Loader2 } from 'lucide-react'

type SharePointItem = {
  id: string
  name: string
  webUrl: string
  folder?: { childCount: number }
  file?: { mimeType: string }
}

interface SharePointFilePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelected: (item: { id: string; name: string; url: string }) => void
}

export default function SharePointFilePicker({
  open,
  onOpenChange,
  onSelected,
}: SharePointFilePickerProps) {
  const [path, setPath] = useState('/Esdeveniments')
  const [items, setItems] = useState<SharePointItem[]>([])
  const [loading, setLoading] = useState(false)
  const [stack, setStack] = useState<string[]>([]) // Per "Enrere"

  /* ─────────────────────────────────────────────
     GET → Carrega contingut de la carpeta
  ───────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return
    setLoading(true)

    fetch(`/api/sharepoint/browse?path=${encodeURIComponent(path)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Resposta ${r.status}`)
        const text = await r.text()
        if (!text) return { items: [] }
        try {
          return JSON.parse(text)
        } catch {
          console.error('❌ JSON invàlid rebut de SharePoint:', text)
          return { items: [] }
        }
      })
      .then((data) => setItems(data.items ?? []))
      .catch((err) => console.error('❌ Error carregant SharePoint:', err))
      .finally(() => setLoading(false))
  }, [open, path])

  /* ─────────────────────────────────────────────
     Quan l’usuari fa clic a un element
  ───────────────────────────────────────────── */
  const handleClick = (item: SharePointItem) => {
    if (item.folder) {
      // Obrir carpeta
      setStack((prev) => [...prev, path])
      setPath(`${path}/${item.name}`)
      return
    }

    if (item.file) {
      // 🔥 URL 100% pública via proxy → sense login Microsoft
      const publicUrl = `/api/sharepoint/file?itemId=${encodeURIComponent(
        item.id
      )}`

      onSelected({
        id: item.id,
        name: item.name,
        url: publicUrl,
      })

      onOpenChange(false)
    }
  }

  /* ─────────────────────────────────────────────
     Enrere
  ───────────────────────────────────────────── */
  const goBack = () => {
    const prev = [...stack]
    const last = prev.pop()
    setStack(prev)
    if (last) setPath(last)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40">
      <Card className="w-11/12 max-w-md rounded-2xl shadow-xl">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Navega per SharePoint
            </h2>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Tanca
            </Button>
          </div>

          {/* Path */}
          <div className="flex items-center mb-2">
            {stack.length > 0 && (
              <Button size="icon" variant="ghost" onClick={goBack} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <p className="text-xs text-gray-500 truncate">{path}</p>
          </div>

          {/* Llistat */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-blue-50 rounded-md transition"
                >
                  <div className="flex items-center gap-2">
                    {item.folder ? (
                      <Folder className="h-4 w-4 text-blue-600" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="text-sm text-gray-800">{item.name}</span>
                  </div>
                  {item.folder ? (
                    <span className="text-xs text-gray-400">
                      {item.folder.childCount ?? 0}
                    </span>
                  ) : (
                    <span className="text-xs text-blue-600">Obrir</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
