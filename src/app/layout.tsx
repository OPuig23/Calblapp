// filename: src/app/layout.tsx
'use client'

import React, { useEffect, useState } from 'react'
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
import { Settings } from 'lucide-react'


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <head>
        <title>Cal Blay</title>
        <meta name="description" content="WebApp Cal Blay" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body suppressHydrationWarning={true}>
        <Providers>
          <TooltipProvider>
            <NotificationsProvider>
              <InnerLayout>{children}</InnerLayout>
            </NotificationsProvider>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}

/* ----------------------------------------------------------
   INNER LAYOUT — CAPÇALERA UNIVERSAL + MENÚ LATERAL
----------------------------------------------------------- */

function InnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const { data: session, status } = useSession()
  const user = session?.user

  const [menuOpen, setMenuOpen] = useState(false)

  // Protecció de sessió
  useEffect(() => {
    if (status !== 'loading' && !session && !pathname.startsWith('/login')) {
      router.replace('/login')
    }
  }, [status, session, pathname, router])

  if (pathname.startsWith('/login')) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50">
        <Image src="/logo.png" alt="Cal Blay" width={200} height={80} className="object-contain mb-2" />
        {children}
      </div>
    )
  }

  const username = user?.name || user?.email || 'Usuari'
  const avatarLetter = username[0]?.toUpperCase() ?? 'U'

  const role = normalizeRole(user?.role || '')
  const dept = (user?.department || '').toLowerCase()

  const NAV_ITEMS = [
    { label: 'Torns', path: '/menu/torns', roles: ['admin','direccio','cap','treballador'] },
    { label: 'Esdeveniments', path: '/menu/events', roles: ['admin','direccio','cap','treballador','comercial','usuari'] },
    { label: 'Pissarra', path: '/menu/pissarra', roles: ['admin','direccio','cap','treballador','comercial','usuari'] },
    { label: 'Personal', path: '/menu/personnel', roles: ['admin','direccio','cap'] },
    { label: 'Quadrants', path: '/menu/quadrants', roles: ['admin','direccio','cap'] },
    { label: 'Incidències', path: '/menu/incidents', roles: ['admin','direccio','cap'] },
    { label: 'Informes', path: '/menu/reports', roles: ['admin','direccio'] },
    { label: 'Usuaris', path: '/menu/users', roles: ['admin'] },
    { label: 'Transports', path: '/menu/transports', roles: ['admin','direccio','cap'] },
    { label: 'Calendar', path: '/menu/calendar', roles: ['admin','direccio','comercial'] },
  ]

  const navItemsByRole = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-800">

      {/* --------------------- CAPÇALERA UNIVERSAL --------------------- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div className="h-14 flex items-center justify-between px-4">

          {/* Botó hamburguesa */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link href="/menu">
  <Image
    src="/logo.png"
    alt="Cal Blay"
    width={120}
    height={50}
    className="object-contain"
    priority
  />
</Link>


          {/* Avatar + Logout */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase border border-blue-200">
              {avatarLetter}
            </div>

            <button
              onClick={async () => {
                await signOut({ redirect: false })
                router.replace('/login')
              }}
              className="p-2 rounded hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>

        </div>
      </header>

      {/* ----------------------- MENÚ LATERAL ----------------------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/40" onClick={() => setMenuOpen(false)}>
          <div
            className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl p-4 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">Menú</span>
              <button onClick={() => setMenuOpen(false)} className="p-1">✕</button>
            </div>

           <nav className="flex flex-col gap-2">
  {navItemsByRole.map(item => (
    <Link
      key={item.path}
      href={item.path}
      onClick={() => setMenuOpen(false)}
      className="px-3 py-2 rounded-md hover:bg-gray-100 text-gray-800"
    >
      {item.label}
    </Link>
  ))}

  {/* Botó configuració */}
<Link
  href="/menu/configuracio"
  onClick={() => setMenuOpen(false)}
  className="px-3 py-2 rounded-md hover:bg-gray-100 text-gray-800 flex items-center gap-2"
>
  <Settings className="w-5 h-5" />
  <span></span>
</Link>

</nav>

          </div>
        </div>
      )}

      {/* --------------------------- CONTINGUT --------------------------- */}
      <main className="px-2 sm:px-4 pb-6 max-w-7xl mx-auto overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
