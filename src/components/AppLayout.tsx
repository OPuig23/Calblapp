// File: src/components/AppLayout.tsx
import React, { ReactNode } from 'react'
import AppHeader from './AppHeader'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <main className="bg-gray-50 min-h-screen">
      <AppHeader />
      {children}
    </main>
  )
}
