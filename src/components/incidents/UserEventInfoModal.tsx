'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

import { Loader2, Users, X } from 'lucide-react'

import { db } from '@/lib/firebaseClient'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventCode: string | null
}

export default function EventResponsablesModal({ open, onOpenChange, eventCode }: Props) {
  const [loading, setLoading] = useState(true)

  const [comercial, setComercial] = useState<string | null>(null)
  const [responsables, setResponsables] = useState<{
    serveis: string | null
    logistica: string | null
    cuina: string | null
  }>({
    serveis: null,
    logistica: null,
    cuina: null,
  })

  useEffect(() => {
    if (!open || !eventCode) return

    const fetchData = async () => {
      setLoading(true)

      // 🔹 Llegir stage_verd → comercial
      const qStage = query(
        collection(db, 'stage_verd'),
        where('code', '==', eventCode)
      )
      const snapStage = await getDocs(qStage)

      if (!snapStage.empty) {
        const data = snapStage.docs[0].data()
        setComercial(data?.Comercial || null)
      }

      // 🔹 Responsables de cada departament
      const serv = await getDoc(doc(db, 'quadrantsServeis', eventCode))
      const logi = await getDoc(doc(db, 'quadrantsLogistica', eventCode))
      const cuin = await getDoc(doc(db, 'quadrantsCuina', eventCode))

      setResponsables({
        serveis: serv.exists() ? serv.data()?.responsable?.responsableName || null : null,
        logistica: logi.exists() ? logi.data()?.responsable?.responsableName || null : null,
        cuina: cuin.exists() ? cuin.data()?.responsable?.responsableName || null : null,
      })

      setLoading(false)
    }

    fetchData()
  }, [open, eventCode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl shadow-xl border bg-white [&>button]:hidden">

        {/* BOTÓ TANCAR — mateixa tècnica que FincaModal */}
        <DialogClose asChild>
          <button
            className="absolute right-4 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            Informació assignada a l'esdeveniment
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin w-6 h-6 text-gray-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 text-sm mt-2">

            {/* Comercial */}
            <section>
              <h3 className="font-semibold text-blue-700 mb-1">Comercial</h3>
              <p className="text-gray-700">{comercial || '—'}</p>
            </section>

            {/* Responsables departamentals */}
            <section>
              <h3 className="font-semibold text-green-700 mb-1">
                Responsables departamentals
              </h3>

              <p><b>Serveis:</b> {responsables.serveis || '—'}</p>
              <p><b>Logística:</b> {responsables.logistica || '—'}</p>
              <p><b>Cuina:</b> {responsables.cuina || '—'}</p>
            </section>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
