// filename: src/app/layout.tsx
'use client'

import React, { PropsWithChildren, useEffect } from 'react'
import { Providers } from '@/app/providers'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { normalizeRole, type Role } from '@/lib/roles'
import { NotificationsProvider } from '@/context/NotificationsContext'
import './globals.css'


// ------------ Tipus d'usuari de sessió ----------
type SessionUser = {
  id?: string
  role?: string
  department?: string
  name?: string
  email?: string
  pushEnabled?: boolean
}

/* ================= NAV ITEMS ================== */
const NAV_ITEMS: {
  label: string
  path: string
  roles: Role[]
  department?: string | string[]
}[] = [
  { label: 'Torns', path: '/menu/torns', roles: ['admin', 'direccio', 'cap', 'treballador'] },
  { label: 'Esdeveniments', path: '/menu/events', roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'] },
  { label: 'Pissarra', path: '/menu/pissarra', roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'] },
  { label: 'Personal', path: '/menu/personnel', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Quadrants', path: '/menu/quadrants', roles: ['admin', 'direccio', 'cap'] },
  { label: 'Incidències', path: '/menu/incidents', roles: ['admin', 'direccio', 'cap'] },
  {
    label: 'Registre de modificacions',
    path: '/menu/modifications',
    roles: ['admin', 'direccio', 'cap'],
    department: 'Producció, Cuina, Logistica',
  },
  { label: 'Informes', path: '/menu/reports', roles: ['admin', 'direccio'] },
  { label: 'Usuaris', path: '/menu/users', roles: ['admin'] },
  { label: 'Transports', path: '/menu/transports', roles: ['admin', 'direccio', 'cap'], department: 'Transports' },
  { label: 'Preparació Logística', path: '/menu/logistics', roles: ['admin', 'direccio', 'cap', 'treballador'], department: 'Logistica' },
  { label: 'Calendar', path: '/menu/calendar', roles: ['admin', 'direccio', 'comercial'] },
  { label: 'Espais', path: '/menu/spaces', roles: ['admin', 'direccio', 'cap'] },
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

/* ============ INNER LAYOUT ================== */
function InnerLayout({ children }: PropsWithChildren) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { data: session, status } = useSession()
  const user = session?.user as SessionUser | undefined

  // ---------- Logout ----------
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
    } finally {
      router.replace('/login')
    }
  }

  // ---------- Redirigir si no hi ha sessió ----------
  useEffect(() => {
    if (status !== 'loading' && !session && !pathname.startsWith('/login')) {
      router.replace('/login')
    }
  }, [status, session, pathname, router])

  const [mobileOpen, setMobileOpen] = React.useState(false)

  // ---------- Layout especial login ----------
  if (pathname.startsWith('/login')) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50">
        <Image src="/logo.png" alt="Cal Blay" width={200} height={80} className="object-contain mb-2" />
        {children}
      </div>
    )
  }

  // ---------- Informació usuari ----------
  const username = user?.name || user?.email || 'Usuari'
  const avatarLetter = (username[0] || 'U').toUpperCase()
  const role = normalizeRole(user?.role || '')
  const roleLabel = ROLE_LABEL[role]
  const roleBadgeClass = ROLE_BADGE_CLASS[role]
  const dept = (user?.department || '').toLowerCase()

  const navItemsByRole = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(role)) return false

    if (item.path === '/menu/modifications' && role === 'cap')
      return ['produccio', 'cuina', 'logistica'].includes(dept)

    if (role === 'cap' && item.department) {
      if (Array.isArray(item.department))
        return item.department.map(d => d.toLowerCase()).includes(dept)

      return item.department.toLowerCase() === dept
    }

    return true
  })

  const isMenuHome = pathname === '/menu'

  // ---------- RETURN LAYOUT ----------
  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="pointer-events-none h-[1px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />
        <div className="pt-[env(safe-area-inset-top)]" />

        {isMenuHome ? (
          /* ===== HEADER MINIM MENU ===== */
          <div className="h-14 relative flex items-center justify-between px-4">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
              {avatarLetter}
            </div>

            <Link href="/menu" className="absolute left-1/2 -translate-x-1/2">
              <Image src="/logo.png" alt="Cal Blay" width={200} height={96} className="h-20 w-auto object-contain" priority />
            </Link>

            <button onClick={handleSignOut} aria-label="Tancar sessió" className="p-1 rounded hover:bg-gray-100 active:scale-95">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        ) : (
          <>
            {/* ≣≣≣ MOBILE HEADER ≣≣≣ */}
            <div className="md:hidden h-14 relative flex items-center justify-between px-4">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
                {avatarLetter}
              </div>

              <Link href="/menu" className="absolute left-1/2 -translate-x-1/2">
                <Image src="/logo.png" alt="Cal Blay" width={200} height={96} className="h-20 w-auto object-contain" />
              </Link>

              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded hover:bg-gray-100 active:scale-95"
                aria-label="Obrir menú"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* ≣≣≣ DESKTOP HEADER ≣≣≣ */}
            <div className="hidden md:flex items-center justify-between py-2 px-4 md:px-8 max-w-7xl mx-auto w-full">
              <Link href="/menu" className="flex-shrink-0 flex items-center py-2">
                <Image src="/logo.png" alt="Cal Blay" width={130} height={60} className="object-contain" />
              </Link>

              <nav className="flex-1 flex justify-center">
                <ul className="hidden lg:flex flex-wrap gap-2 lg:gap-3">
                  {navItemsByRole.map((item) => {
                    const isActive = pathname.startsWith(item.path)
                    return (
                      <li key={`${item.path}-${item.label}`}>
                        <Link
                          href={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition
                          ${isActive ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-800 hover:bg-gray-100/70'}`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ring-1 ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
                  {avatarLetter}
                </div>
                <button onClick={handleSignOut} className="p-2 rounded hover:bg-gray-100">
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ≣≣≣ SLIDE OVER MENU MOBILE ≣≣≣ */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)}>
            <div
              className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl p-4 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">Menú</span>
                <button onClick={() => setMobileOpen(false)} className="p-1">✕</button>
              </div>

              <nav className="flex flex-col gap-2">
                {navItemsByRole.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-md hover:bg-gray-100 text-gray-800"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                onClick={handleSignOut}
                className="mt-auto px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
              >
                Tancar sessió
              </button>
            </div>
          </div>
        )}

      </header>

      <main className="w-full px-2 sm:px-4 pb-6 sm:max-w-7xl sm:mx-auto overflow-visible">
        {children}
      </main>
    </div>
  )
}

/* ================== ROOT LAYOUT ================== */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 🔹 Registre general SW (PWA + Push)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
      navigator.serviceWorker.register('/firebase-messaging-service-worker.js')
    }
  }, [])

  return (
    <html lang="ca">
      <head>
        <title>Cal Blay</title>
        <meta name="description" content="WebApp Cal Blay" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1e293b" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
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
