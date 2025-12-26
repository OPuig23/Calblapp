// src/app/providers.tsx
'use client'

import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { registerServiceWorker } from '@/lib/register-sw'

// Instància única de QueryClient per a tota l'aplicació
const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  // Registra el service worker un sol cop al costat client
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
