// src/context/NotificationsContext.tsx
'use client'
import { createContext, useContext } from 'react'
import { useUnreadCount } from '@/hooks/notifications'   // 👈 nom correcte

type Ctx = { count: number; loading: boolean; refresh: () => void }
const NotificationsCtx = createContext<Ctx>({ count: 0, loading: true, refresh: () => {} })

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { count, loading, refresh } = useUnreadCount()
  return (
    <NotificationsCtx.Provider value={{ count, loading, refresh }}>
      {children}
    </NotificationsCtx.Provider>
  )
}

export function useNotificationsCtx() {
  return useContext(NotificationsCtx)
}
