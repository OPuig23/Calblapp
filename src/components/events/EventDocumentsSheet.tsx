//file: src/components/events/EventDocumentsSheet.tsx
'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
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

/* Icons */
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

/* Portal */
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

/* Utils */
const safeUrl = (url?: string | null) => {
  if (!url) return ''
  const u = String(url).trim()
  // bloqueig bàsic
  if (!u) return ''
  if (u.startsWith('javascript:')) return ''
  return u
}

/* Component */
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
  // ✅ Hooks sempre a dalt (rules of hooks)
  const { docs, loading, error } = useEventDocuments(eventId, eventCode || undefined)

  const [isNarrow, setIsNarrow] = useState(false)

  // Detecta PWA/standalone
  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any).standalone === true
    )
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsNarrow(window.innerWidth < 900)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Quan és PWA o pantalla estreta, sí que forcem l'obertura i tanquem el sheet.
  const forceWindowOpen = isStandalone || isNarrow

  // Bloqueja scroll del body mentre està obert (millor UX mòbil)
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleOpenDoc = useCallback(
    (rawUrl: string) => {
      const url = safeUrl(rawUrl)
      if (!url || typeof window === 'undefined' || typeof document === 'undefined') return

      // IMPORTANT:
      // - En Android PWA, '_blank' sovint reusa la mateixa vista.
      // - Usem un "name" únic per forçar finestreta/tab nova quan es pugui.
      const name = `doc_${Date.now()}`
      let opened = false

      // 1) Si NO cal forçar (desktop ample), deixem comportament normal amb window.open (sense tancar sheet).
      // 2) Si cal forçar (PWA / narrow), fem window.open + fallback i tanquem el sheet amb petit delay.
      const tryWindowOpen = () => {
        const win = window.open(url, name, 'noopener,noreferrer')
        if (win) {
          try {
            win.opener = null
          } catch {}
          opened = true
        }
      }

      tryWindowOpen()

      if (!opened) {
        // Fallback: anchor click (alguns Android bloquegen window.open però permeten click)
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.style.position = 'absolute'
        a.style.left = '-9999px'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      if (forceWindowOpen) {
        // Delay curt per evitar “parpelleig” i que el navegador tingui temps d'obrir
        window.setTimeout(() => onOpenChange(false), 150)
      }
    },
    [forceWindowOpen, onOpenChange]
  )

  const kindLabel = (d: EventDoc) => {
    if (d.icon === 'pdf') return 'PDF'
    if (d.icon === 'sheet') return 'XLS'
    if (d.icon === 'slide') return 'PPT'
    if (d.icon === 'img') return 'IMG'
    if (d.icon === 'doc') return 'DOC'
    const clean = (d.url || '').split('?')[0]
    const last = clean.split('/').filter(Boolean).pop() || ''
    const ext = last.includes('.') ? last.split('.').pop() : ''
    return (ext || 'LINK').toUpperCase()
  }

  const displayTitle = (d: EventDoc) => {
    const title = d.title?.trim()
    if (title && title.toLowerCase() !== 'file') return title
    return d.id || title || 'Document'
  }

  if (!open) return null

  return (
    <Portal>
      <div className="relative w-full h-full">
        {/* OVERLAY */}
        <div className="absolute inset-0 bg-black/50 z-10" onClick={() => onOpenChange(false)} />

        {/* DRAWER */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col"
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
                className="w-full rounded-xl border p-3 flex items-center gap-3 bg-white"
              >
                {/* ICONA */}
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DocIcon d={d} />
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={d.title || d.id}>
                    {displayTitle(d)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold shrink-0">
                      {kindLabel(d)}
                    </span>
                    <span className="capitalize">{d.source.replace('-', ' ')}</span>
                    {d.id && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                        {d.id}
                      </span>
                    )}
                  </div>
                </div>

                {/* BOTÓ */}
                <button
                  type="button"
                  className="text-blue-600 text-sm font-semibold hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleOpenDoc(d.url)
                  }}
                >
                  Obrir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}
