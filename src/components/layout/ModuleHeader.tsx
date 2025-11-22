// file: src/components/layout/ModuleHeader.tsx
'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  title?: string
  subtitle?: string
  icon?: React.ReactNode
}

export default function ModuleHeader({ title, subtitle, icon }: Props) {
  const pathname = usePathname() ?? ''

  const segment = pathname.split('/')[2]

  const colorMap: Record<string, string> = {
    personnel: 'from-green-100 to-lime-100',
    events: 'from-yellow-100 to-orange-100',
    spaces: 'from-emerald-100 to-green-50',
    torns: 'from-blue-100 to-blue-50'
  }

  const color = colorMap[segment] ?? 'from-gray-50 to-gray-100'

  return (
    <div className={`w-full bg-gradient-to-r ${color} border-b border-gray-200 px-4 py-3`}>
      <div className="flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex items-center justify-center">
              {icon}
            </div>
          )}

          <div className="flex flex-col">
            {title && <div className="font-semibold capitalize">{title}</div>}
            {subtitle && (
              <div className="text-xs italic text-gray-600">{subtitle}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
