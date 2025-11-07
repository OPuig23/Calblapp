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

type SessionUser = {
  role?: string
  department?: string
  name?: string
  email?: string
}

const NAV_ITEMS: {
  label: string
  path: string
  roles: Role[]
  department?: string | string[]
}[] = [
  { label: 'Torns', path: '/menu/torns', roles: ['admin', 'direccio', 'cap', 'treballador'] },
  { label: 'Esdeveniments', path: '/menu/events', roles: ['admin', 'direccio', 'cap', 'treballador', 'comercial', 'usuari'] },
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
  { label: 'Preparació Logística', path: '/menu/Logistics', roles: ['admin', 'direccio', 'cap', 'treballador'], department: 'Logistica' },
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

function InnerLayout({ children }: PropsWithChildren) {
  const handleSignOut = async () => {
  try {
    await signOut({ redirect: false }) // sense redirect intern
  } finally {
    router.replace('/login')           // redirecció controlada
  }
}

  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname() ?? '' // <- evita l’error de null

  useEffect(() => {
    if (status !== 'loading' && !session && !pathname.startsWith('/login')) {
      router.replace('/login')
    }
  }, [status, session, pathname, router])

  // Layout especial per /login
  if (pathname.startsWith('/login')) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50">
        <Image src="/logo.png" alt="Cal Blay" width={200} height={80} className="object-contain mb-2" />
        {children}
      </div>
    )
  }

  const username = session?.user?.name || session?.user?.email || 'Usuari'
  const avatarLetter = (username[0] || 'U').toUpperCase()
  const role = normalizeRole(((session?.user as SessionUser)?.role) || '')
  const roleLabel = ROLE_LABEL[role]
  const roleBadgeClass = ROLE_BADGE_CLASS[role]
  const userDept = ((session?.user as SessionUser)?.department) || ''

  const dept = ((session?.user as SessionUser)?.department || '').toLowerCase()

const navItemsByRole = NAV_ITEMS.filter((item) => {
  if (!item.roles.includes(role)) return false

  // 🔸 Cas especial: Registre de modificacions
  if (item.path === '/menu/modifications' && role === 'cap') {
    return ['produccio', 'cuina', 'logistica'].includes(dept)
  }

  // 🔸 Altres mòduls amb restricció per departament (ex: Transports)
 // 🔸 Altres mòduls amb restricció per departament (ex: Transports)
if (role === 'cap' && item.department) {
  // pot ser un string o una llista
  if (Array.isArray(item.department)) {
    return item.department.map(d => d.toLowerCase()).includes(dept)
  }
  return item.department.toLowerCase() === dept
}


  return true
})



  const isMenuHome = pathname === '/menu'

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="pointer-events-none h-[1px] bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />
        <div className="pt-[env(safe-area-inset-top)]" />

        {isMenuHome ? (
          /* ===== Capçalera mínima només al /menu ===== */
          <div className="h-14 relative flex items-center justify-between px-4">
            {/* Inicial usuari (esquerra) */}
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
              {avatarLetter}
            </div>

            {/* Logo centrat (link a /menu) */}
            <Link
              href="/menu"
              aria-label="Cal Blay — Tornar al menú"
              className="absolute left-1/2 -translate-x-1/2"
            >
              <Image
                src="/logo.png"
                alt="Cal Blay"
                width={200}
                height={96}
                className="h-20 w-auto object-contain"
                priority
              />
            </Link>

            {/* Sortir discret (dreta) */}
            <button
              onClick={handleSignOut}
              aria-label="Tancar sessió"
              title="Tancar sessió"
              className="p-1 rounded hover:bg-gray-100 active:scale-95"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
) : (
  <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
    {/* -- MÒBIL: avatar esquerra, logo centrat, sortir dreta -- */}
    <div className="md:hidden h-14 relative flex items-center justify-between">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
        {avatarLetter}
      </div>

      <Link
        href="/menu"
        aria-label="Cal Blay — Tornar al menú"
        className="absolute left-1/2 -translate-x-1/2"
      >
        <Image src="/logo.png" alt="Cal Blay" width={200} height={96} className="h-20 w-auto object-contain" />
      </Link>

      <button
        onClick={handleSignOut}
        aria-label="Tancar sessió"
        title="Tancar sessió"
        className="p-1 rounded hover:bg-gray-100 active:scale-95"
      >
        <LogOut className="w-5 h-5 text-gray-600" />
      </button>
    </div>

    {/* -- ESCRIPTORI: capçalera existent (sense canvis) -- */}
    <div className="hidden md:flex items-center justify-between py-2">
      {/* Logo → /menu */}
      <Link href="/menu" className="flex-shrink-0 flex items-center py-2">
        <Image src="/logo.png" alt="Cal Blay" width={130} height={60} className="object-contain" />
      </Link>

      {/* NAV (ja quedarà ocult en mòbil) */}
      <nav className="flex-1 flex justify-center">
        <ul className="hidden md:flex flex-wrap gap-2 md:gap-3">
          {navItemsByRole.map((item) => {
            const isActive = pathname.startsWith(item.path)
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                    ${isActive ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-800 hover:bg-gray-100/70'}`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Usuari + sortir */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-sm ring-1 ${roleBadgeClass}`}>{roleLabel}</span>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
          {avatarLetter}
        </div>
        <button onClick={handleSignOut} className="p-2 rounded hover:bg-gray-100" aria-label="Tancar sessió" title="Tancar sessió">
          <LogOut className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </div>
)
}
      </header>

      <main className="flex-1 w-full px-2 sm:px-4 pb-6 sm:max-w-7xl sm:mx-auto">{children}</main>

   </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
  <head>
    <title>Cal Blay</title>
    <meta name="description" content="WebApp Cal Blay" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
