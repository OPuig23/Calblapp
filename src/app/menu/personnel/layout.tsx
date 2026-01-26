// filename: src/app/menu/personnel/layout.tsx
'use client'

import React from 'react'

export default function PersonnelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-white'>
      <main className='w-full px-2 sm:px-4 md:px-6'>{children}</main>
    </div>
  )
}
