// file: src/components/users/UserRequestsList.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useNotificationsList } from '@/hooks/notifications'
import { UserFormModal } from '@/components/users/UserFormModal'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  createdAt: number
  read: boolean
  personId?: string   // 👈 molt important
}

interface ModalData {
  id: string | null
  personId: string
  _notificationId: string
}

type Props = {
  onAfterAction?: () => void   // callback per refrescar la taula principal
}

export function UserRequestsList({ onAfterAction }: Props) {
  const { notifications, refresh } = useNotificationsList(50)
  const [modalData, setModalData] = React.useState<ModalData | null>(null)

  // 🔹 Filtrar només sol·licituds d’usuari pendents
  const userRequests = (notifications as Notification[]).filter(
    n => n.type === 'user_request' && !n.read
  )

  // 🔹 Obrir modal amb personId perquè faci fetch directe a Firestore
  const openModalFromRequest = (req: Notification) => {
    console.log('📩 Obrint modal per notificació:', req)

    if (!req.personId) {
      console.error('❌ Notificació sense personId:', req)
      return
    }

    setModalData({
      id: null,
      personId: req.personId,       // 👈 ara sí passem personId
      _notificationId: req.id,      // per marcar després com llegida
    })
  }

  // 🔹 Quan admin desa usuari nou (després de approve)
  const handleSave = async () => {
    if (!modalData) return
    console.log('💾 Usuari creat correctament via approve')

    // Marquem notificació com llegida
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'markRead',
        notificationId: modalData._notificationId,
      }),
    })

    await refresh()
    onAfterAction?.()
    setModalData(null)
  }

  // 🔹 Quan admin rebutja la sol·licitud
  const handleReject = async (req: Notification) => {
    console.log('🛑 Rebutjant sol·licitud:', req)

    if (!req.personId) {
      console.error("❌ No hi ha personId a la notificació:", req)
      return
    }

    // 1️⃣ Trucar al backend per actualitzar userRequests + personnel
    const res = await fetch(`/api/user-requests/${req.personId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Rebutjada manualment' }),
    })
    const data = await res.json()
    console.log("📤 Resposta reject:", data)

    // 2️⃣ Si tot bé, marquem notificació com llegida
    if (data.success) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', notificationId: req.id }),
      })
      console.log("✅ Notificació marcada com llegida:", req.id)
    } else {
      console.error("❌ Error al rebutjar:", data)
    }

    await refresh()
    onAfterAction?.()
  }

  return (
    <div className="mb-6">
      {userRequests.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Sol·licituds pendents</h2>
          <div className="space-y-3">
            {userRequests.map(req => (
              <div
                key={req.id}
                className="p-4 border rounded-lg bg-yellow-50 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{req.title}</p>
                  <p className="text-sm text-gray-700">{req.body}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openModalFromRequest(req)}
                  >
                    Acceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(req)}
                  >
                    Rebutjar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de creació d'usuari amb dades carregades des de Firestore */}
      {modalData && (
        <UserFormModal
          user={modalData}
          onSubmit={handleSave}
          onClose={() => {
            console.log('❌ Modal tancat sense desar')
            setModalData(null)
          }}
        />
      )}
    </div>
  )
}
