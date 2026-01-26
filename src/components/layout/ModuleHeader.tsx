'use client'

import React from 'react'
import { usePathname } from 'next/navigation'

interface Props {
  title?: string | React.ReactNode
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}

export default function ModuleHeader({ title, subtitle, icon, actions }: Props) {
  const pathname = usePathname() ?? ''

  // Exemple: /menu/spaces/reserves → ['','menu','spaces','reserves']
  const segments = pathname.split('/').filter(Boolean)

  // Identifiquem el mòdul (spaces, torns, quadrants, etc.)
  const module = segments[1] || ''
  const submodule = segments[2] || ''

  // Map colors automàtics
  const colorMap: Record<string, string> = {
    personnel: 'from-green-100 to-lime-100',
    events: 'from-yellow-100 to-orange-100',
    spaces: 'from-emerald-100 to-green-50',
    torns: 'from-blue-100 to-blue-50',
    quadrants: 'from-indigo-100 to-indigo-50',
    allergens: 'from-amber-100 to-yellow-50',
  }

  const color = colorMap[module] ?? 'from-gray-50 to-gray-100'

  // Traducció “mòdul → nom visible”
  const moduleLabels: Record<string, string> = {
    spaces: 'Espais',
    torns: 'Torns',
    quadrants: 'Quadrants',
    personnel: 'Personal',
    events: 'Esdeveniments',
    allergens: 'Al·lèrgens',
  }

  const mainLabel = moduleLabels[module] || module

  // Traducció “submòdul → nom visible”
  const subLabels: Record<string, string> = {
    reserves: 'Reserves',
    operativa: 'Operativa',
    drafts: 'Esborranys',
    info: 'Informació',
    assigned: 'Assignats',
    bbdd: 'BBDD plats',
    buscador: 'Buscador',
  }

  const subLabel = subLabels[submodule] || ''

  return (
    <div className={`w-full bg-gradient-to-r ${color} border-b border-gray-200 px-4 py-3`}>
      <div className="flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center gap-2">
          {icon && <div>{icon}</div>}

          <div className="flex flex-col">

            {/* BREADCRUMB AUTOMÀTIC */}
            <div className="flex items-center gap-1 text-sm font-semibold">
              
              {/* MÒDUL PRINCIPAL (clicable) */}
              <a
                href={`/menu/${module}`}
                className="text-gray-800 hover:underline"
              >
                {mainLabel}
              </a>

              {/* SEPARADOR */}
              {subLabel && <span className="text-gray-500">/</span>}

              {/* SUBMÒDUL (clicable) */}
              {subLabel && (
                <a
                  href={`/menu/${module}/${submodule}`}
                  className="text-gray-700 hover:underline"
                >
                  {subLabel}
                </a>
              )}
            </div>

            {/* SUBTÍTOL OPCIONAL */}
            {subtitle && (
              <div className="text-xs italic text-gray-600">{subtitle}</div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
