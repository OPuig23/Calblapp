// file: src/components/users/UserRequestResultsList.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useNotificationsList, markNotificationRead } from '@/hooks/notifications'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  createdAt: number
  read: boolean
  personId?: string
}

type Props = {
  onAfterAction?: () => void
}

export function UserRequestResultsList({ onAfterAction }: Props) {
  const { notifications, refresh } = useNotificationsList(30, 'user_request_result')

  const pending = (notifications as Notification[]).filter(n => !n.read)

  const handleRead = async (n: Notification) => {
    await markNotificationRead(n.id)
    await refresh()
    onAfterAction?.()
  }

  if (pending.length === 0) return null

  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold mb-3">Respostes a sol·licituds d’usuari</h2>
      <div className="space-y-3">
        {pending.map(n => (
          <div
            key={n.id}
            className="p-4 border rounded-lg bg-emerald-50 flex items-center justify-between"
          >
            <div className="pr-4">
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-gray-700">{n.body}</p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleRead(n)}
            >
              Entès
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserRequestResultsList
