// file: src/hooks/useDeletePersonnel.ts
'use client'

import { useState } from 'react'

export function useDeletePersonnel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mutateAsync(personId: string): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/personnel/${personId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(body.error || res.statusText)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error desconegut eliminant personal')
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutateAsync, loading, error }
}
