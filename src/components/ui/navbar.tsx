// File: src/components/ui/navbar.tsx

import React from 'react'
import Link from 'next/link'

/**
 * Navbar component with site logo and navigation links
 */
export function Navbar() {
  return (
    <nav className="bg-white shadow p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/menu" className="text-xl font-bold text-gray-900">
          Cal Blay
        </Link>
        <div className="space-x-4">
          <Link href="/menu/events" className="text-gray-700 hover:text-gray-900">
            Esdeveniments
          </Link>
          <Link href="/menu" className="text-gray-700 hover:text-gray-900">
            Menú Principal
          </Link>
        </div>
      </div>
    </nav>
  )
}
