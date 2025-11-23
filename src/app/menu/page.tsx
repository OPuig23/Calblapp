// file: src/app/menu/page.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
import { useFCMToken } from '@/hooks/useFCMToken'

interface SessionUser {
  id: string
  role?: string
  department?: string
  deptLower?: string
  pushEnabled?: boolean
  name?: string | null
  email?: string | null
  image?: string | null
}

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
    value: 'pissarra',
    label: 'La Pissarra',
    path: '/menu/pissarra',
    roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'],
    icon: FileEdit,
    color: 'from-rose-100 to-pink-50',
    iconColor: 'text-rose-600',
  },
  {
    value: 'calendar',
    label: 'Calendar',
    path: '/menu/calendar',
    roles: ['admin', 'direccio'],
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
    value: 'Logistics',
    label: 'Preparació Logística',
    path: '/menu/Logistics',
    roles: ['admin', 'direccio', 'cap', 'treballador'],
    icon: Truck,
    color: 'from-green-100 to-emerald-50',
    iconColor: 'text-green-600',
  },
  {
    value: 'modifications',
    label: 'Modificacions',
    path: '/menu/modifications',
    roles: ['admin', 'direccio', 'cap'],
    icon: FileEdit,
    color: 'from-purple-100 to-violet-100',
    iconColor: 'text-purple-600',
  },
  {
    value: 'spaces',
    label: 'Espais',
    path: '/menu/spaces',
    roles: ['admin', 'direccio', 'cap'],
    icon: CalendarDays,
    color: 'from-emerald-100 to-green-50',
    iconColor: 'text-emerald-600',
  },
]

export default function MenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { tornsCount, usuarisCount } = useUnreadCountsByType()
  const { requestToken, error: fcmError } = useFCMToken()

  const isLoading = status === 'loading'
  const user = session?.user as SessionUser | undefined
  const role = normalizeRole((user?.role as string) || '')
  const dept = (user?.department || '').toLowerCase()

  // 🔔 estat local: aquest dispositiu ja té push activat?
  const [hasDevicePush, setHasDevicePush] = useState<boolean>(false)

useEffect(() => {
  if (!user?.id) return
  const key = `cb_push_activated_${user.id}`
  setHasDevicePush(localStorage.getItem(key) === '1')
}, [user?.id])

  // 🔐 Redirecció si no hi ha sessió
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // 👉 Funció per activar notificacions en aquest dispositiu
const handleEnablePush = async () => {
  try {
    const token = await requestToken()
    if (!token || !user?.id) return

    await fetch(`/api/users/${user.id}/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const key = `cb_push_activated_${user.id}`
    localStorage.setItem(key, '1')
    setHasDevicePush(true)

    console.log('[CalBlay] Push activat al dispositiu')
  } catch (err) {
    console.error('[CalBlay] Error activant push:', err)
  }
}


  // 🔎 Filtre de mòduls per rol i departament
  const modules = useMemo(() => {
    return MODULES.filter((mod) => {
      if (!mod.roles.includes(role)) return false

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
    <section className="relative w-full max-w-2xl mx-auto p-4">

      {/* ⚙️ Configuració per Admin / Direcció */}
    <Link
      href="/menu/configuracio"
      title="Configuració"
      className="absolute top-5 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 shadow-sm transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-gray-600 hover:text-gray-800"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.591 1.04 1.724 1.724 0 012.307.307 1.724 1.724 0 01-.307 2.307 1.724 1.724 0 001.04 2.591c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.04 2.591 1.724 1.724 0 01-.307 2.307 1.724 1.724 0 01-2.307-.307 1.724 1.724 0 00-2.591 1.04c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.591-1.04 1.724 1.724 0 01-.307-2.307 1.724 1.724 0 00-1.04-2.591c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.04-2.591 1.724 1.724 0 01.307-2.307 1.724 1.724 0 012.307.307 1.724 1.724 0 002.591-1.04z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </Link>

           <h1 className="text-2xl font-bold mb-4 text-center">
        Accedeix als teus mòduls
      </h1>

      {/* GRID de mòduls */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
        {modules.map((mod) => {
          const isActive = pathname?.startsWith(mod.path)
          return (
            <Link
              key={mod.value}
              href={mod.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                `group rounded-2xl bg-gradient-to-br ${mod.color} p-4 flex flex-col items-center justify-center transition-all shadow hover:shadow-lg hover:scale-105 active:scale-95 border border-blue-200`,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                isActive && 'ring-2 ring-blue-400 scale-105',
              )}
            >
              <div
                className={`relative mb-2 rounded-full bg-white shadow flex items-center justify-center w-14 h-14 group-hover:bg-blue-50 transition-all ${mod.iconColor}`}
              >
                {(() => {
                  const Icon = mod.icon
                  return <Icon className={`w-8 h-8 ${mod.iconColor}`} />
                })()}

                {mod.value === 'torns' && tornsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tornsCount}
                  </span>
                )}

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
