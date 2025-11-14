//filename:src\components\events\EventDocumentsSheet.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Eye, FileText, FileSpreadsheet, Presentation, File, Image as ImgIcon, X } 
 from 'lucide-react'
import useEventDocuments, { EventDoc } from '@/hooks/events/useEventDocuments'
import DocumentViewer from '@/components/events/DocumentViewer'

function DocIcon({ d }: { d: EventDoc }) {
  switch (d.icon) {
    case 'pdf': return <FileText className="h-4 w-4" />
    case 'sheet': return <FileSpreadsheet className="h-4 w-4" />
    case 'slide': return <Presentation className="h-4 w-4" />
    case 'img': return <ImgIcon className="h-4 w-4" />
    case 'doc': return <File className="h-4 w-4" />
    default: return <ExternalLink className="h-4 w-4" />
  }
}

/**
 * Drawer mòbil-first sense dependències shadcn/ui Sheet.
 * Mostra llista d’adjunts i previsualització si hi ha previewUrl.
 */
export default function EventDocumentsSheet({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { docs, loading, error } = useEventDocuments(eventId)
  const [selected, setSelected] = useState<EventDoc | null>(null)
  const hasPreview = useMemo(() => !!selected?.previewUrl, [selected])

  if (!open) return null

  return (
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-[60] flex flex-col"
      onClick={() => onOpenChange(false)}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Drawer */}
      <div
        className="mt-auto relative w-full bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">Documents</h3>
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Tancar"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contingut */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {loading && <p className="text-sm text-gray-500">Carregant documents…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && docs.length === 0 && (
            <p className="text-sm text-gray-600">Aquest esdeveniment no té adjunts.</p>
          )}

          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border p-3 flex items-center gap-3">
              <div className="shrink-0 rounded-lg bg-gray-100 p-2"><DocIcon d={d} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {d.source.replace('-', ' ')}
                </div>
              </div>
              {d.previewUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelected(d)}
                  className="rounded-lg"
                >
                  <Eye className="h-4 w-4 mr-1" /> Vista
                </Button>
              )}
              <a href={d.url} target="_blank" rel="noreferrer" className="ml-2">
                <Badge variant="outline" className="rounded-lg">Obrir</Badge>
              </a>
            </div>
          ))}
        </div>

        {/* Previsualització */}
        {selected && (
          <div className="border-t p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">{selected.title}</div>
              <div className="flex items-center gap-2">
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Obre a Google
                </a>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)} className="rounded-lg">
                  Tancar vista
                </Button>
              </div>
            </div>
            {hasPreview ? (
              <DocumentViewer url={selected.previewUrl!} title={selected.title} />
            ) : (
              <p className="text-sm text-gray-600">
                Aquest document no admet previsualització. Fes clic a “Obrir”.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
