'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { normalizeRole } from '@/lib/roles'
import { useEffect } from 'react'
import { getAblyClient } from '@/lib/ablyClient'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAdminUserRequestCount() {
  const { data: session, status } = useSession()
  const isAuth = status === 'authenticated'
  const role = normalizeRole((session?.user as any)?.role || '')
  const isAdmin = role === 'admin'

  const url = isAuth && isAdmin
    ? '/api/notifications?mode=count&type=user_request'
    : null

  const { data, error, mutate } = useSWR(url, fetcher, {
    refreshInterval: isAuth && isAdmin ? 15000 : 0,
  })

  useEffect(() => {
    if (!isAuth || !isAdmin) return

    const client = getAblyClient()
    const channel = client.channels.get('admin:user-requests')
    const handler = () => {
      mutate().catch(() => {})
    }

    channel.subscribe('created', handler)

    return () => {
      channel.unsubscribe('created', handler)
    }
  }, [isAuth, isAdmin, mutate])

  return {
    count: data?.count ?? 0,
    loading: status === 'loading' || (isAuth && isAdmin && !data && !error),
    error,
    refresh: mutate,
    isAdmin,
  }
}

export async function markAdminUserRequestsRead() {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'markAllRead', type: 'user_request' }),
  })
}

export function useUserRequestResultCount() {
  const { data: session, status } = useSession()
  const isAuth = status === 'authenticated'
  const userId = (session?.user as any)?.id

  const url = isAuth
    ? '/api/notifications?mode=count&type=user_request_result'
    : null

  const { data, error, mutate } = useSWR(url, fetcher, {
    refreshInterval: isAuth ? 15000 : 0,
  })

  useEffect(() => {
    if (!isAuth || !userId) return

    const client = getAblyClient()
    const channel = client.channels.get(`user:${userId}:notifications`)
    const handler = () => {
      mutate().catch(() => {})
    }

    channel.subscribe('created', handler)

    return () => {
      channel.unsubscribe('created', handler)
    }
  }, [isAuth, userId, mutate])

  return {
    count: data?.count ?? 0,
    loading: status === 'loading' || (isAuth && !data && !error),
    error,
  }
}
