// filename: src/components/layout/ModuleHeader.tsx
'use client'

import React from 'react'

interface Props {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function ModuleHeader({ icon, title, subtitle, children }: Props) {
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-100 p-6 rounded-2xl mb-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {icon}
            <h1 className="text-2xl font-extrabold text-indigo-900">{title}</h1>
          </div>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}
