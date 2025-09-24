// file: src/hooks/usePersonnel.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { normalize } from '@/utils/normalize'

export interface Personnel {
  id:         string
  name?:      string
  role:       'responsible' | 'driver' | 'soldier' | string
  driver?: {
    isDriver: boolean
    camioGran: boolean 
    camioPetit: boolean
  }
  department: string
  email?:     string | null
  phone?:     string | null
  available?: boolean              // ✅ estat de disponibilitat
  hasUser: boolean
  requestStatus: 'none' | 'pending' | 'approved' | 'rejected'
}

export function usePersonnel(department?: string) {
  const { status } = useSession()
  const [data, setData]       = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  /**
   * 🔹 Carrega tota la llista de personal (filtrat per departament si cal)
   */
  const fetchData = useCallback(async () => {
    if (status !== 'authenticated') return
    setLoading(true)
    setError(null)

    try {
      const deptFold = department ? normalize(department) : ''
      const url = deptFold
        ? `/api/personnel?department=${encodeURIComponent(deptFold)}`
        : '/api/personnel'

      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'fetch_error')

      // 🔑 sempre assegurem que hi ha camp available
      const arr: Personnel[] = Array.isArray(body?.data)
        ? body.data.map((p: Personnel) => ({
            ...p,
            available: p.available ?? true,
          }))
        : []

      setData(arr)
    } catch (err: any) {
      setError(err.message || 'unknown_error')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [status, department])

  useEffect(() => {
    if (status === 'authenticated') fetchData()
  }, [status, fetchData])

  /**
   * 🔹 Canvia l’estat disponible/no disponible d’una persona
   * Amb optimistic update (es veu el canvi a la UI immediatament).
   */
  const toggleAvailability = useCallback(async (personId: string, available: boolean) => {
    // Optimistic update
    setData(prev =>
      prev.map(p => (p.id === personId ? { ...p, available } : p))
    )

    try {
      const res = await fetch(`/api/personnel/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'update_error')

      return body
    } catch (err) {
      // Si falla → revertim l’estat
      setData(prev =>
        prev.map(p => (p.id === personId ? { ...p, available: !available } : p))
      )
      throw err
    }
  }, [])

  /**
   * 🔹 Sol·licita la creació d’un usuari vinculat a aquesta persona
   */
  const requestUser = useCallback(async (personId: string) => {
    const res = await fetch(`/api/personnel/${personId}/request-user`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body?.error || 'request_user_error')

    await fetchData()
    return body
  }, [fetchData])

  /**
   * 🔹 Elimina una persona del sistema
   */
  const deletePersonnel = useCallback(async (personId: string) => {
    const res = await fetch(`/api/personnel/${personId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || 'delete_error')
    }

    await fetchData()
  }, [fetchData])

  return {
    data,
    isLoading: loading,
    isError:   Boolean(error),
    error,
    refetch:   fetchData,
    requestUser,
    deletePersonnel,
    toggleAvailability,   // ✅ ara sí funcional i estable
  }
}
