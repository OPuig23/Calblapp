// File: src/app/menu/page.tsx
'use client'

import React, { useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  User,
  Calendar,
  CalendarDays,
  Users,
  Grid,
  AlertTriangle,
  BarChart2,
  Shield,
  Truck,
  FileEdit,
} from 'lucide-react'
import { normalizeRole, type Role } from '@/lib/roles'
import { useUnreadCountsByType } from '@/hooks/notifications'
import type { LucideIcon } from 'lucide-react'


interface ModuleOption {
  value: string
  label: string
  path: string
  roles: Role[]
  icon: LucideIcon
  color: string
  iconColor: string
}

const MODULES: ModuleOption[] = [
  {
    value: 'torns',
    label: 'Torns',
    path: '/menu/torns',
    roles: ['admin', 'direccio', 'cap', 'treballador'],
    icon: Grid,
    color: 'from-blue-100 to-indigo-100',
    iconColor: 'text-blue-500',
  },
  {
    value: 'events',
    label: 'Esdeveniments',
    path: '/menu/events',
    roles: ['admin', 'direccio', 'cap', 'treballador'],
    icon: Calendar,
    color: 'from-yellow-100 to-orange-100',
    iconColor: 'text-orange-500',
  },
  {
    value: 'calendar',
    label: 'Calendar',
    path: '/menu/calendar',
    roles: ['admin', 'direccio'], // ➕ aquí afegirem 'comercial' quan existeixi el rol
    icon: CalendarDays,
    color: 'from-indigo-100 to-blue-50',
    iconColor: 'text-indigo-500',
  },
  {
    value: 'personnel',
    label: 'Personal',
    path: '/menu/personnel',
    roles: ['admin', 'direccio', 'cap'],
    icon: Users,
    color: 'from-green-100 to-lime-100',
    iconColor: 'text-green-600',
  },
  {
    value: 'quadrants',
    label: 'Quadrants',
    path: '/menu/quadrants',
    roles: ['admin', 'direccio', 'cap'],
    icon: User,
    color: 'from-indigo-100 to-blue-50',
    iconColor: 'text-indigo-500',
  },
  {
    value: 'incidents',
    label: 'Incidències',
    path: '/menu/incidents',
    roles: ['admin', 'direccio', 'cap'],
    icon: AlertTriangle,
    color: 'from-red-100 to-pink-100',
    iconColor: 'text-red-500',
  },
  {
    value: 'reports',
    label: 'Informes',
    path: '/menu/reports',
    roles: ['admin', 'direccio'],
    icon: BarChart2,
    color: 'from-cyan-100 to-blue-100',
    iconColor: 'text-cyan-600',
  },
  {
    value: 'users',
    label: 'Usuaris',
    path: '/menu/users',
    roles: ['admin'],
    icon: Shield,
    color: 'from-gray-200 to-gray-50',
    iconColor: 'text-gray-600',
  },
  {
    value: 'transports',
    label: 'Transports',
    path: '/menu/transports',
    roles: ['admin', 'direccio', 'cap'],
    icon: Truck,
    color: 'from-orange-100 to-yellow-100',
    iconColor: 'text-orange-600',
  },
  {
  value: 'modifications',
  label: 'Modificacions',
  path: '/menu/modifications',
  roles: ['admin', 'direccio', 'cap'], // 👈 mantenim el rol genèric de cap
  icon: FileEdit,
  color: 'from-purple-100 to-violet-100',
  iconColor: 'text-purple-600',
},

]

export default function MenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { tornsCount, usuarisCount } = useUnreadCountsByType()

  const isLoading = status === 'loading'
  const user = session?.user
  const role = normalizeRole((user?.role as string) || '')

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

 const dept = (user?.department || '').toLowerCase()

const modules = useMemo(() => {
  return MODULES.filter(mod => {
    if (!mod.roles.includes(role)) return false

    // 🔸 Filtre addicional per al mòdul de modificacions
    if (mod.value === 'modifications' && role === 'cap') {
      return ['produccio', 'cuina', 'logistica'].includes(dept)
    }

    return true
  })
}, [role, dept])


  if (isLoading) return <p className="text-center mt-20">Carregant…</p>
  if (!user) return <p className="text-center mt-20">No autoritzat.</p>
  if (!modules.length) return <p className="text-center mt-20">No tens cap mòdul assignat.</p>

  return (
    <section className="w-full max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Accedeix als teus mòduls</h1>
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-5">
        {modules.map(mod => {
          const isActive = pathname?.startsWith(mod.path)
          return (
            <Link
              key={mod.value}
              href={mod.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                `group rounded-2xl bg-gradient-to-br ${mod.color} p-4 flex flex-col items-center justify-center transition-all shadow hover:shadow-lg hover:scale-105 active:scale-95 border border-blue-200`,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                isActive && 'ring-2 ring-blue-400 scale-105'
              )}
            >
              <div
                className={`relative mb-2 rounded-full bg-white shadow flex items-center justify-center w-14 h-14 group-hover:bg-blue-50 transition-all ${mod.iconColor}`}
              >
                {(() => { const Icon = mod.icon; return <Icon className={`w-8 h-8 ${mod.iconColor}`} aria-hidden /> })()}

                {/* 🔔 Badge per Torns */}
                {mod.value === 'torns' && tornsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tornsCount}
                  </span>
                )}

                {/* 🔔 Badge per Usuaris */}
                {mod.value === 'users' && usuarisCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {usuarisCount}
                  </span>
                )}
              </div>
              <span className="text-base font-semibold text-gray-700 text-center group-hover:text-gray-900 transition">
                {mod.label}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
