//file: src/components/events/EventDocumentsSheet.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
  const u = String(url || '').trim()
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
  const { docs, loading, error } = useEventDocuments(eventId, eventCode || undefined)

  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setIsNarrow(window.innerWidth < 900)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      (window.navigator as any).standalone === true
    )
  }, [])

  // IMPORTANT: per operativa, en Android/PWA obrim a la mateixa vista (100% fiable).
  const shouldOpenSameWindow = isStandalone || isNarrow

  // Bloqueja scroll del body mentre està obert (UX)
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // ESC per tancar (desktop)
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const linkTarget = shouldOpenSameWindow ? '_self' : '_blank'
  const linkRel = linkTarget === '_blank' ? 'noopener noreferrer' : undefined

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

            {docs.map((d) => {
              const url = safeUrl(d.url)
              const isDisabled = !url

              return (
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

                  {/* BOTO */}
                  <a
                    href={url || '#'}
                    target={linkTarget}
                    rel={linkRel}
                    className={[
                      'text-sm font-semibold',
                      isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 hover:underline',
                    ].join(' ')}
                    aria-disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!url) {
                        e.preventDefault()
                        return
                      }
                      if (shouldOpenSameWindow) {
                        onOpenChange(false)
                      }
                    }}
                  >
                    Obrir
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Portal>
  )
}
