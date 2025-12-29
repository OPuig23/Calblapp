'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Image as ImgIcon,
  X,
} from 'lucide-react'
import useEventDocuments, { EventDoc } from '@/hooks/events/useEventDocuments'

/* ───────────────────────── Icons ───────────────────────── */
function DocIcon({ d }: { d: EventDoc }) {
  switch (d.icon) {
    case 'pdf':
      return <FileText className="h-4 w-4" />
    case 'sheet':
      return <FileSpreadsheet className="h-4 w-4" />
    case 'slide':
      return <Presentation className="h-4 w-4" />
    case 'img':
      return <ImgIcon className="h-4 w-4" />
    case 'doc':
      return <File className="h-4 w-4" />
    default:
      return <ExternalLink className="h-4 w-4" />
  }
}

/* ───────────────────────── Portal ───────────────────────── */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [el] = useState(() => {
    if (typeof document === 'undefined') return null
    const d = document.createElement('div')
    d.className = 'fixed inset-0 z-[12000]'
    return d
  })

  useEffect(() => {
    if (!el) return
    document.body.appendChild(el)
    setMounted(true)
    return () => {
      document.body.removeChild(el)
    }
  }, [el])

  if (!mounted || !el) return null
  return createPortal(children, el)
}

/* ───────────────────────── Component ───────────────────────── */
export default function EventDocumentsSheet({
  eventId,
  eventCode,
  open,
  onOpenChange,
}: {
  eventId: string
  eventCode?: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { docs, loading, error } = useEventDocuments(eventId, eventCode || undefined)

  if (!open) return null

  return (
    <Portal>
      <div className="relative w-full h-full">
        {/* OVERLAY */}
        <div
          className="absolute inset-0 bg-black/50 z-10"
          onClick={() => onOpenChange(false)}
        />

        {/* DRAWER */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20
                     bg-white rounded-t-2xl shadow-2xl
                     max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-base font-semibold">Documents</h3>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {loading && <p className="text-sm text-gray-500">Carregant…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && docs.length === 0 && (
              <p className="text-sm text-gray-600">Sense documents.</p>
            )}

            {docs.map((d) => (
              <div
                key={d.id}
                className="w-full rounded-xl border p-3
                           flex items-center gap-3
                           bg-white"
              >
                {/* ICONA */}
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DocIcon d={d} />
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{d.title}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {d.source.replace('-', ' ')}
                  </div>
                </div>

                {/* ÚNIC BOTÓ */}
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm font-semibold hover:underline"
                >
                  Obrir
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}
