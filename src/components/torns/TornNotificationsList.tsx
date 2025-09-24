//file: src/components/torns/TornNotificationsList.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useNotificationsList, markNotificationRead } from '@/hooks/notifications'

interface Notification {
  id: string
  title?: string
  body?: string
  type: string
  createdAt: number
  read: boolean
  tornId?: string
  payload?: {
    weekLabel?: string
    weekStartISO?: string
    dept?: string
    quadrantId?: string
  }
}

type Props = {
  onAfterAction?: () => void
}

export function TornNotificationsList({ onAfterAction }: Props) {
  const { notifications, refresh } = useNotificationsList(50, 'NEW_SHIFTS')
  const router = useRouter()

  const tornNotis = notifications.filter(n => !n.read)

  const openTorn = async (n: Notification) => {
    let url = '/menu/torns'

    if (n.payload?.weekStartISO) {
      url += `?week=${n.payload.weekStartISO}`
      if (n.payload?.quadrantId) {
        url += `&focus=${n.payload.quadrantId}`
      }
    } else if (n.tornId) {
      url += `?focus=${n.tornId}`
    }

    router.push(url)

    await markNotificationRead(n.id)
    await refresh()
    onAfterAction?.()
  }

  if (tornNotis.length === 0) return null

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Nous torns assignats</h2>
      <div className="space-y-3">
        {tornNotis.map(n => (
          <div
            key={n.id}
            className="p-4 border rounded-lg bg-blue-50 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">
                {n.title || `Torns setmana ${n.payload?.weekLabel || ''}`}
              </p>
              <p className="text-sm text-gray-700">
                {n.body || `Departament: ${n.payload?.dept || ''}`}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => openTorn(n)}
            >
              Obrir
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
