// File: src/app/page.tsx
'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Si no està autenticat, anem al login
      router.replace('/login')
    } else if (status === 'authenticated') {
      // Si ja està autenticat, anem al menú principal
      router.replace('/menu')
    }
  }, [status, router])

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <p className="text-lg text-gray-700">
        {status === 'loading' ? 'Carregant...' : 'Redirigint...'}
      </p>
    </div>
  )
}
