'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PreventiusHistorialPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/menu/manteniment/seguiment')
  }, [router])
  return null
}
