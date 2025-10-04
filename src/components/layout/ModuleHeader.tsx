//file: src/components/layout/ModuleHeader.tsx
'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  icon?: React.ReactNode
  title: string
  subtitle?: string
}

export default function ModuleHeader({ icon, title, subtitle }: Props) {
  
  const pathname = usePathname() ?? ''


  // 🎨 Assigna color segons el mòdul actiu
  const colorMap: Record<string, string> = {
    '/menu/events': 'from-yellow-100 to-orange-100',
    '/menu/torns': 'from-blue-100 to-indigo-100',
    '/menu/personnel': 'from-green-100 to-lime-100',
    '/menu/incidents': 'from-red-100 to-pink-100',
    '/menu/reports': 'from-cyan-100 to-blue-100',
    '/menu/quadrants': 'from-indigo-100 to-blue-50',
    '/menu/users': 'from-gray-200 to-gray-50',
    '/menu/transports': 'from-orange-100 to-yellow-100',
    '/menu/calendar': 'from-indigo-100 to-blue-50',
  }

  const matchedKey = Object.keys(colorMap).find(key => pathname.startsWith(key))
  const color = matchedKey ? colorMap[matchedKey] : 'from-gray-50 to-gray-100'


  return (
    <div
      className={`w-[100vw] -mx-4 sm:mx-0 bg-gradient-to-r ${color} border-b border-gray-200 px-4 py-2`}
    >
      <div className="flex items-center gap-2 text-sm text-gray-800">
        {icon && <span className="text-base text-gray-600">{icon}</span>}
        <span className="font-semibold tracking-wide">{title}</span>
        {subtitle && (
          <span className="hidden sm:inline text-gray-600 text-xs italic">
            · {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
