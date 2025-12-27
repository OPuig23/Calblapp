// file: src/hooks/notifications.ts
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  createdAt: number
  read: boolean
  tornId?: string
  userId?: string
}

/* 🔹 Comptador global o filtrat per tipus */
export function useUnreadCount(type?: string) {
  const url = type
    ? `/api/notifications?mode=count&type=${type}`
    : `/api/notifications?mode=count`

  const { data, error, mutate } = useSWR(url, fetcher, { refreshInterval: 15000 })

  return {
    count: data?.count ?? 0,
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}

/* 🔹 Llista de notificacions (amb suport per type) */
export function useNotificationsList(limit = 20, type?: string) {
  const url = type
    ? `/api/notifications?mode=list&limit=${limit}&type=${type}`
    : `/api/notifications?mode=list&limit=${limit}`

  const { data, error, mutate } = useSWR(url, fetcher)

  return {
    notifications: (data?.notifications as Notification[]) ?? [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}

/* 🔹 Accions de notificacions */
export async function markAllRead(type?: string) {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markReadAll', type }),
  })
}

export async function markNotificationRead(notificationId: string) {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markRead', notificationId }),
  })
}

/* 🔹 Comptadors separats per tipus */
export function useUnreadCountsByType() {
  const { data, error, mutate } = useSWR('/api/notifications?mode=list&limit=200', fetcher, {
    refreshInterval: 15000,
  })

  const notis = (data?.notifications as Notification[]) ?? []

  // Accepta tant "torn_assigned" com "NEW_SHIFTS"
  const tornsCount =
    notis.filter(
      (n: Notification) =>
        !n.read &&
        (n.type === 'torn_assigned' || n.type === 'NEW_SHIFTS')
    ).length

  const usuarisCount =
    notis.filter(
      (n: Notification) => !n.read && n.type === 'user_request'
    ).length

  const usuarisResultCount =
    notis.filter(
      (n: Notification) => !n.read && n.type === 'user_request_result'
    ).length

  return {
    tornsCount,
    usuarisCount,
    usuarisResultCount,
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}
