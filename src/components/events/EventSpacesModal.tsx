'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Home, X, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { db } from '@/lib/firebaseClient'
import { doc, getDoc } from 'firebase/firestore'

/**
 * EventSpacesModal
 * -----------------
 * Modal de CONSULTA (read-only)
 * Mostra info de PRODUCCIÓ de la finca associada a l’esdeveniment
 * 🔗 Sempre permet obrir la FITXA COMPLETA (mòdul Espais)
 */

/* ================= Tipus ================= */

interface Props {
  open: boolean
  onClose: () => void
  fincaId: string | null
  eventSummary?: string
}

interface ProduccioData {
  aperitiu?: string[]
  oficina?: string[]
  observacions?: unknown
}

interface FincaData {
  id: string
  nom?: string
  ln?: string
  produccio?: ProduccioData
}

/* ================= Utils ================= */

function safeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join('\n')
  return String(value)
}

/* ================= Component ================= */

export default function EventSpacesModal({
  open,
  onClose,
  fincaId,
  eventSummary,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [finca, setFinca] = useState<FincaData | null>(null)

  useEffect(() => {
    if (!open || !fincaId) return

    const load = async () => {
      try {
        setLoading(true)
        const ref = doc(db, 'finques', fincaId)
        const snap = await getDoc(ref)

        if (snap.exists()) {
          setFinca({ id: snap.id, ...(snap.data() as any) })
        } else {
          setFinca(null)
        }
      } catch (err) {
        console.error('❌ Error carregant espai:', err)
        setFinca(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, fincaId])

  const produccio = finca?.produccio

const openFullSpace = () => {
  if (!finca?.id) return

  const url = `/menu/spaces/info/${finca.id}`

  // Obrim en una pestanya nova
  window.open(url, '_blank', 'noopener,noreferrer')

  // Tanquem el modal actual
  onClose()
}


  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[92vw] max-w-md rounded-2xl p-0 overflow-hidden">
        {/* ================= Header ================= */}
        <div className="px-5 pt-5 pb-3 relative">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-slate-700" />
              Espais · Producció
            </DialogTitle>
            <DialogDescription>
              {finca?.nom || eventSummary || 'Espai associat a l’esdeveniment'}
              {finca?.ln ? ` · ${finca.ln}` : ''}
            </DialogDescription>
          </DialogHeader>

          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-200 transition"
            aria-label="Tancar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= Body ================= */}
        <div className="px-5 pb-5 max-h-[65vh] overflow-auto space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
            </div>
          )}

          {!loading && !produccio && (
            <p className="text-sm text-gray-500">
              No hi ha informació de producció per aquest espai.
            </p>
          )}

          {!loading && produccio && (
            <>
              {Array.isArray(produccio.aperitiu) &&
                produccio.aperitiu.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-slate-900 mb-2">
                      Aperitiu
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {produccio.aperitiu.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {Array.isArray(produccio.oficina) &&
                produccio.oficina.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4 bg-white">
                    <p className="font-semibold text-slate-900 mb-2">
                      Oficina / Producció
                    </p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {produccio.oficina.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {produccio.observacions && (
                <div className="rounded-xl border border-slate-200 p-4 bg-white">
                  <p className="font-semibold text-slate-900 mb-2">
                    Observacions
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-line break-words">
                    {safeText(produccio.observacions)}
                  </p>
                </div>
              )}
            </>
          )}

          {/* 🔗 ENLLAÇ SEMPRE VISIBLE */}
          {finca?.id && (
            <div className="pt-4 border-t">
              <button
                type="button"
                onClick={openFullSpace}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Veure fitxa completa de l’espai
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
