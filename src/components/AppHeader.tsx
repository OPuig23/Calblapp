// File: src/components/AppHeader.tsx
'use client'
import { useSession } from 'next-auth/react'
import { Menu } from 'lucide-react'
import Link from 'next/link'

export default function AppHeader({ title }: { title?: string }) {
  const { data: session } = useSession()
  const username = session?.user?.name || session?.user?.email || 'Usuari'

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 border-b border-gray-100 backdrop-blur flex items-center h-16 px-4 md:px-8 shadow-sm">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-4">
        <img src="/logo-calblay.png" alt="Cal Blay" className="h-8 w-auto" />
      </Link>

      {/* Títol contextual (opcional) */}
      {title && (
        <div className="flex-1 text-lg md:text-xl font-semibold text-gray-900 select-none">
          {title}
        </div>
      )}

      {/* Usuari */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden sm:inline text-gray-700 font-medium">{username}</span>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg uppercase">
          {username[0]}
        </div>
        {/* Opcional: menú hamburguesa per a mòbil */}
        <button className="ml-2 p-2 rounded hover:bg-gray-100">
          <Menu className="w-6 h-6 text-gray-500" />
        </button>
      </div>
    </header>
  )
}
