// filename: src/app/layout.tsx
'use client'

import React, { PropsWithChildren, useEffect } from 'react'
import { Providers } from '@/app/providers'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { normalizeRole, type Role } from '@/lib/roles'
import { NotificationsProvider } from '@/context/NotificationsContext'
import './globals.css'

const NAV_ITEMS: { label: string; path: string; roles: Role[]; department?: string }[] = [
  { label: 'Torns', path: '/menu/torns', roles: ['admin', 'direccio', 'cap', 'treballador'] },
  { label: 'Esdeveniments', path: '/menu/events', roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'] },
  { label: 'Personal', path: '/menu/personnel', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Quadrants', path: '/menu/quadrants', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Incidències', path: '/menu/incidents', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Informes', path: '/menu/reports', roles: ['admin', 'direccio'] },
  { label: 'Usuaris', path: '/menu/users', roles: ['admin'] },
  { label: 'Transports', path: '/menu/transports', roles: ['admin', 'direccio', 'cap'], department: 'Transports' },
  { label: 'Calendar', path: '/menu/calendar', roles: ['admin', 'direccio', 'comercial'] },
]

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  direccio: 'Direcció',
  cap: 'Cap departament',
  treballador: 'Treballador',
  comercial: 'Comercial',
  usuari: 'Usuari',
}

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: 'bg-blue-50 text-blue-700 ring-blue-200',
  direccio: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cap: 'bg-amber-50 text-amber-700 ring-amber-200',
  treballador: 'bg-slate-100 text-slate-700 ring-slate-200',
  comercial: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  usuari: 'bg-gray-100 text-gray-700 ring-gray-200',
}

function InnerLayout({ children }: PropsWithChildren) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const path = usePathname()

  useEffect(() => {
    if (status !== 'loading' && !session && !path.startsWith('/login')) {
      router.replace('/login')
    }
  }, [status, session, path, router])

  if (path.startsWith('/login')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Image src="/logo.png" alt="Cal Blay" width={200} height={200} className="object-contain" />
        {children}
      </div>
    )
  }

  const username = session?.user?.name || session?.user?.email || 'Usuari'
  const avatarLetter = username[0]?.toUpperCase() || 'U'
  const role = normalizeRole((session?.user as any)?.role)
  const roleLabel = ROLE_LABEL[role]
  const roleBadgeClass = ROLE_BADGE_CLASS[role]
  const userDept = (session?.user as any)?.department || ''

  const navItemsByRole = NAV_ITEMS.filter((item) => {
    if (role === 'admin' || role === 'direccio') return true
    if (role === 'cap') {
      if (item.department) {
        return item.department.toLowerCase() === userDept.toLowerCase()
      }
      return true
    }
    return item.roles.includes(role)
  })

  const isMenuHome = path === '/menu'

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="pointer-events-none h-[1px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between py-2 px-4 md:px-8">
          {/* Logo → /menu */}
          <Link href="/menu" className="flex-shrink-0 flex items-center py-2 cursor-pointer">
            <Image
              src="/logo.png"
              alt="Cal Blay"
              width={130}
              height={60}
              className="object-contain transition-transform hover:scale-[1.02]"
            />
          </Link>

          {/* NAV */}
          <nav className="flex-1 flex justify-center w-full overflow-x-auto md:overflow-visible mt-2 md:mt-0">
            {!isMenuHome && (
              <ul className="flex flex-wrap gap-2 md:gap-3">
                {navItemsByRole.map((item) => {
                  const isActive = path.startsWith(item.path)
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                          ${isActive ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-800 hover:bg-gray-100/70'}`}
                      >
                        {isActive && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-blue-300/60" />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </nav>

          {/* Usuari */}
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <span className={`hidden sm:inline px-3 py-1 rounded-full text-sm ring-1 ${roleBadgeClass}`}>
              {roleLabel}
            </span>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
              {avatarLetter}
            </div>
            <button
              onClick={() => router.push('/login')}
              className="p-2 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="Tancar Sessió"
              title="Tancar sessió"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4">{children}</main>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <head>
        <title>Cal Blay</title>
        <meta name="description" content="WebApp Cal Blay" />
      </head>
      <body suppressHydrationWarning={true}>
        <Providers>
          <TooltipProvider delayDuration={200}>
            <NotificationsProvider>
              <InnerLayout>{children}</InnerLayout>
            </NotificationsProvider>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
