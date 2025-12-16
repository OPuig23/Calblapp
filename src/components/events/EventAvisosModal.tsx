//file: src/components/events/EventAvisosModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAvisos, Aviso } from '@/hooks/useAvisos'

interface Props {
  open: boolean
  onClose: () => void
  eventCode: string | null
  user: {
    name?: string
    department?: string
    role?: string
  }
}

export default function EventAvisosModal({ open, onClose, eventCode, user }: Props) {
  /* ───────────────── LOGS D’ENTRADA ───────────────── */
  console.log('🟢 EventAvisosModal render')
  console.log('➡️ open:', open)
  console.log('➡️ code rebut:', eventCode)
  console.log('➡️ user:', user)

  const {
    avisos,
    loading,
    error,
    createAviso,
    updateAviso,
    deleteAviso,
  } = useAvisos(eventCode)

  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Aviso | null>(null)

  /* ───────────────── LOG CANVIS ESTAT ───────────────── */
  useEffect(() => {
    console.log('🔁 CANVI CODE:', eventCode)
  }, [eventCode])

  useEffect(() => {
    console.log('🔁 CANVI TEXT:', text)
  }, [text])

  useEffect(() => {
    console.log('🔁 CANVI EDITING:', editing)
  }, [editing])

  const canEdit =
    !!editing &&
    (user.role === 'admin' ||
      user.role === 'direccio' ||
      editing.createdBy.name === user.name)

  const resetForm = () => {
    console.log('↩️ resetForm')
    setText('')
    setEditing(null)
  }

  const handleSave = async () => {
    console.log('🟡 CLICK Guardar avís')
    console.log('➡️ eventCode:', eventCode)
    console.log('➡️ text:', text)
    console.log('➡️ editing:', editing)
    console.log('➡️ canEdit:', canEdit)

    if (!eventCode) {
      console.warn('⛔ NO HI HA CODE → NO ES GUARDA')
      return
    }

    if (!text.trim()) {
      console.warn('⛔ TEXT BUIT → NO ES GUARDA')
      return
    }

    try {
      if (editing && canEdit) {
        console.log('✏️ UPDATE aviso', editing.id)
        await updateAviso(editing.id, text.trim())
      } else {
        console.log('🆕 CREATE aviso')
        await createAviso({
  eventCode, // ✅ CLAU CORRECTA
  content: text.trim(),
  userName: user.name || 'Desconegut',
  department: user.department || 'Producció',
})


      }

      console.log('✅ GUARDAT OK')
      resetForm()
    } catch (err) {
      console.error('❌ ERROR guardant avís:', err)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    console.log('🗑️ DELETE aviso', editing.id)

    try {
      await deleteAviso(editing.id)
      resetForm()
    } catch (err) {
      console.error('❌ ERROR eliminant avís:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-md rounded-2xl p-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Avisos de producció
          </DialogTitle>
          {eventCode && <p className="text-xs text-gray-400">Codi: {eventCode}</p>}
        </DialogHeader>

        {/* FORM */}
        <div className="space-y-3">
          <Textarea
            placeholder="Escriu l’avís operatiu…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />

          {/* BOTONS FIXOS */}
          <div className="sticky bottom-0 left-0 right-0 bg-white pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetForm}
              >
                Cancel·lar
              </Button>

              {editing && canEdit && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}

              <Button
                onClick={handleSave}
                className="w-full bg-white-600 text-black hover:bg-grey-700"
              >
                {editing ? 'Guardar canvis' : 'Guardar avís'}
              </Button>
            </div>
          </div>
        </div>

        {/* ESTATS */}
        {loading && <p className="text-sm text-gray-500">Carregant avisos…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && avisos.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No hi ha avisos per aquest esdeveniment.
          </p>
        )}

        {/* LLISTA */}
        {!loading && !error && avisos.length > 0 && (
          <div className="space-y-3 mt-3">
            {avisos.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  console.log('✏️ CLICK editar aviso', a.id)
                  setEditing(a)
                  setText(a.content)
                }}
                className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm cursor-pointer hover:bg-slate-50"
              >
                <div className="text-sm font-medium">{a.content}</div>
                <div className="text-xs text-gray-600">
                  {a.createdBy.department} · {a.createdBy.name}
                </div>
                <div className="text-xs text-gray-400">
  {new Date(a.editedAt ?? a.createdAt).toLocaleString('ca-ES')}
  {a.editedAt && ' · editat'}
</div>

              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
