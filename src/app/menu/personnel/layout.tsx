// filename: src/app/menu/personnel/layout.tsx
'use client'

import React from 'react'
import { User } from 'lucide-react'
import ModuleHeader from '@/components/layout/ModuleHeader'

export default function PersonnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* 🔹 Header unificat com als altres mòduls */}
      <ModuleHeader
        icon={<User className="w-7 h-7 text-indigo-600" />}
        title="Personal"
        subtitle="Gestió del personal de Cal Blay"
      />

      {/* 🔹 Contingut de les subpàgines */}
     <main className="w-full px-2 sm:px-4 md:px-6">{children}</main>

    </div> 
  )
}
