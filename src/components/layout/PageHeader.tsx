// filename: src/components/layout/PageHeader.tsx
'use client'

import React from 'react'

interface PageHeaderProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  filters?: React.ReactNode
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  filters,
}: PageHeaderProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Icona + títols */}
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Accions extra */}
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {/* Filtres */}
      {filters && <div className="mt-4">{filters}</div>}
    </div>
  )
}
