'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Grid,
  Calendar,
  CalendarDays,
  Users,
  AlertTriangle,
  BarChart2,
  Shield,
  Truck,
  FileEdit,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUnreadCountsByType } from '@/hooks/notifications'
import { useFCMToken } from '@/hooks/useFCMToken'
import { getVisibleModules } from '@/lib/accessControl'

/* ─────────────────────────────────────────────
   TIPUS
───────────────────────────────────────────── */
interface SessionUser {
  id: string
  role?: string
  department?: string
}

/* ─────────────────────────────────────────────
   MAPA UI (només estètica, NO permisos)
───────────────────────────────────────────── */
const UI_MAP: Record<
  string,
  { icon: LucideIcon; color: string; iconColor: string }
> = {
  '/menu/torns': {
    icon: Grid,
    color: 'from-blue-100 to-indigo-100',
    iconColor: 'text-blue-500',
  },
  '/menu/events': {
    icon: Calendar,
    color: 'from-yellow-100 to-orange-100',
    iconColor: 'text-orange-500',
  },
  '/menu/pissarra': {
    icon: FileEdit,
    color: 'from-rose-100 to-pink-50',
    iconColor: 'text-rose-600',
  },
  '/menu/calendar': {
    icon: CalendarDays,
    color: 'from-indigo-100 to-blue-50',
    iconColor: 'text-indigo-500',
  },
  '/menu/personnel': {
    icon: Users,
    color: 'from-green-100 to-lime-100',
    iconColor: 'text-green-600',
  },
  '/menu/quadrants': {
    icon: User,
    color: 'from-indigo-100 to-blue-50',
    iconColor: 'text-indigo-500',
  },
  '/menu/incidents': {
    icon: AlertTriangle,
    color: 'from-red-100 to-pink-100',
    iconColor: 'text-red-500',
  },
  '/menu/modifications': {
    icon: FileEdit,
    color: 'from-purple-100 to-violet-100',
    iconColor: 'text-purple-600',
  },
  '/menu/reports': {
    icon: BarChart2,
    color: 'from-cyan-100 to-blue-100',
    iconColor: 'text-cyan-600',
  },
  '/menu/users': {
    icon: Shield,
    color: 'from-gray-200 to-gray-50',
    iconColor: 'text-gray-600',
  },
  '/menu/logistica': {
    icon: Truck,
    color: 'from-orange-100 to-yellow-100',
    iconColor: 'text-orange-600',
  },
  '/menu/spaces': {
    icon: CalendarDays,
    color: 'from-emerald-100 to-green-50',
    iconColor: 'text-emerald-600',
  },
}

/* ─────────────────────────────────────────────
   COMPONENT PRINCIPAL
───────────────────────────────────────────── */
export default function MenuPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isLoading = status === 'loading'
  const user = session?.user as SessionUser | undefined

  // 🔐 Protecció sessió
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return <p className="text-center mt-20">Carregant…</p>
  }

  if (!user) {
    return <p className="text-center mt-20">No autoritzat.</p>
  }

  // 👉 només es renderitza quan user existeix
  return <MenuContent user={user} />
}

/* ─────────────────────────────────────────────
   CONTINGUT REAL (hooks dependents d’usuari)
───────────────────────────────────────────── */
function MenuContent({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const { tornsCount, usuarisCount, usuarisResultCount, personnelUnavailableCount } =
    useUnreadCountsByType()
  const { requestToken } = useFCMToken()

  // 🔑 ÚNICA FONT DE MÒDULS
  const modules = getVisibleModules(user)

  return (
    <section className="relative w-full max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Accedeix als teus mòduls
      </h1>

      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
        {modules.map(mod => {
          const ui = UI_MAP[mod.path]
          if (!ui) return null

          const Icon = ui.icon
          const isActive = pathname?.startsWith(mod.path)

          return (
            <Link
              key={mod.path}
              href={mod.path}
              className={cn(
                `group rounded-2xl bg-gradient-to-br ${ui.color} p-4 flex flex-col items-center justify-center transition-all shadow hover:shadow-lg hover:scale-105 active:scale-95 border border-blue-200`,
                isActive && 'ring-2 ring-blue-400 scale-105',
              )}
            >
              <div
                className={cn(
                  'relative mb-2 rounded-full bg-white shadow flex items-center justify-center w-14 h-14 transition',
                  ui.iconColor,
                )}
              >
                <Icon className="w-8 h-8" />

                {mod.path === '/menu/torns' && tornsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tornsCount}
                  </span>
                )}

                {mod.path === '/menu/users' && usuarisCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {usuarisCount}
                  </span>
                )}

                {mod.path === '/menu/personnel' &&
                  usuarisResultCount + personnelUnavailableCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {usuarisResultCount + personnelUnavailableCount}
                  </span>
                )}
              </div>

              <span className="text-base font-semibold text-gray-700 text-center">
                {mod.label}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
