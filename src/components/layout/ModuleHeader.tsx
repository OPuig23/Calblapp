'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  icon?: React.ReactNode
  title?: string // ja no caldrà passar-lo manualment
  subtitle?: string
}

export default function ModuleHeader({ icon, subtitle }: Props) {
  const pathname = usePathname() ?? ''
  const router = useRouter()

  // 🎯 Generem els segments útils del path
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1) // eliminem "menu"

  // 🎨 Colors per mòdul
const colorMap: Record<string, string> = {
  events: 'from-yellow-100 to-orange-100',
  torns: 'from-blue-100 to-indigo-100',
  personnel: 'from-green-100 to-lime-100',
  incidents: 'from-red-100 to-pink-100',
  reports: 'from-cyan-100 to-blue-100',
  quadrants: 'from-indigo-100 to-blue-50',
  users: 'from-gray-200 to-gray-50',
  transports: 'from-orange-100 to-yellow-100',
  logistics: 'from-green-100 to-emerald-50',
  calendar: 'from-indigo-100 to-blue-50',
  pissarra: 'from-rose-100 to-pink-50',
  modifications: 'from-purple-100 to-violet-100',
  spaces: 'from-emerald-100 to-green-50',
}

  const rootSegment = segments[0]
  const color = colorMap[rootSegment] ?? 'from-gray-50 to-gray-100'

  // 🎯 Traduccions simples (podem ampliar després)
  const labels: Record<string, string> = {
    spaces: 'Espais',
    reserves: 'Reserves',
    info: 'Informació',
    events: 'Esdeveniments',
  }

  // 🔗 Funció per clicar un segment
  const handleNav = (index: number) => {
    const target = '/menu/' + segments.slice(0, index + 1).join('/')
    router.push(target)
  }

  return (
    <div className={`w-full bg-gradient-to-r ${color} border-b border-gray-200 px-4 py-2`}>
      <div className="flex items-center gap-2 text-sm text-gray-800">

        {icon && <span className="text-base text-gray-600">{icon}</span>}

        {/* BREADCRUMB */}
        <div className="flex items-center gap-1">
          {segments.map((seg, i) => {
            const label = labels[seg] ?? seg

            const isLast = i === segments.length - 1

            return (
              <div key={i} className="flex items-center gap-1">
                {/* SEPARADOR */}
                {i > 0 && <span>/</span>}

                {/* ENLLAÇ o TEXT */}
                {isLast ? (
                  <span className="font-semibold">{label}</span>
                ) : (
                  <button
                    onClick={() => handleNav(i)}
                    className="text-indigo-700 hover:underline"
                  >
                    {label}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* SUBTÍTOL OPCIONAL */}
        {subtitle && (
          <span className="hidden sm:inline text-gray-600 text-xs italic">
            · {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
