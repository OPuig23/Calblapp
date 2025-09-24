// File: src/hooks/useCreateTransport.ts
'use client'

import { useState } from 'react'

export function useCreateTransport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mutateAsync(payload: {
  plate: string
  type: 'camioPetit' | 'camioGran' | 'furgoneta'
  conductorId?: string | null   // ✅ coherent amb API i Firestore
}) {

    setLoading(true)
    setError(null)
    try {
      
      const res = await fetch('/api/transports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      const body = await res.json()
      
      if (!res.ok) throw new Error(body?.error || 'Error creant transport')
      return body
    } catch (err: any) {
      
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutateAsync, loading, error }
}
