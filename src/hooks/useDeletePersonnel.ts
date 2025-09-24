// src/hooks/useDeletePersonnel.ts
'use client'

import { useState } from 'react'

export function useDeletePersonnel() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)

  async function mutateAsync(id: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/personnel/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as any).error || res.statusText)
      }
    } finally {
      setLoading(false)
    }
  }

  return { mutateAsync, loading, error }
}
