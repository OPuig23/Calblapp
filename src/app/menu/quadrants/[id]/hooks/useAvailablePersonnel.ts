// File: src/app/menu/quadrants/[id]/hooks/useAvailablePersonnel.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useSession } from 'next-auth/react'

export interface PersonnelOption {
  id: string
  name: string
  role: string
  status: 'available' | 'conflict' | 'notfound'
  reason?: string
}

export interface UseAvailablePersonnelOptions {
  departament?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  excludeIds?: string[]
}

/**
 * Hook: useAvailablePersonnel
 * 🔹 Recupera personal disponible per data i departament.
 * 🔹 Controla exclusions locals i errors de xarxa sense bucles.
 */
export function useAvailablePersonnel(opts: UseAvailablePersonnelOptions) {
  const [responsables, setResponsables] = useState<PersonnelOption[]>([])
  const [conductors, setConductors] = useState<PersonnelOption[]>([])
  const [treballadors, setTreballadors] = useState<PersonnelOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)

  const { data: session } = useSession()

  const fetchPersonnel = useCallback(async () => {
    // 🧩 Evitem reentrades mentre s’està carregant
    if (isFetchingRef.current) return
    if (
      !opts.departament ||
      !opts.startDate ||
      !opts.endDate ||
      !opts.startTime ||
      !opts.endTime
    ) {
      setResponsables([])
      setConductors([])
      setTreballadors([])
      return
    }

    setLoading(true)
    setError(null)
    isFetchingRef.current = true

    try {
      const excl = new Set(
        (opts.excludeIds ?? []).map((id) => id.toLowerCase().trim())
      )

      console.log('[useAvailablePersonnel] Fetch start', {
        departament: opts.departament,
        startDate: opts.startDate,
        endDate: opts.endDate,
        startTime: opts.startTime,
        endTime: opts.endTime,
        excludeIds: Array.from(excl),
      })

      const res = await axios.get('/api/personnel/available', {
        params: {
          department: opts.departament,
          startDate: opts.startDate,
          endDate: opts.endDate,
          startTime: opts.startTime,
          endTime: opts.endTime,
        },
        headers: {
          Authorization: `Bearer ${session?.accessToken || ''}`,
        },
        timeout: 7000, // ✅ límit màxim 7s per evitar bloqueigs
      })

      if (!res?.data) throw new Error('Resposta buida del servidor')

      const cleanList = (
        arr: Array<Omit<PersonnelOption, 'status'> & { status: string }>,
        label: string
      ): PersonnelOption[] => {
        const out = arr
          .filter((p) => !excl.has(p.id?.toLowerCase()?.trim?.() || ''))
          .map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            status: (p.status as 'available' | 'conflict' | 'notfound') || 'notfound',
            reason: p.reason,
          }))
        console.log(`[useAvailablePersonnel] CLEAN ${label}`, out.length)
        return out
      }

      setResponsables(cleanList(res.data.responsables || [], 'responsables'))
      setConductors(cleanList(res.data.conductors || [], 'conductors'))
      setTreballadors(cleanList(res.data.treballadors || [], 'treballadors'))
    } catch (err: unknown) {
      console.error('[useAvailablePersonnel] ERROR', err)
      const message =
        err instanceof Error
          ? err.message.includes('Network Error')
            ? 'No es pot connectar amb el servidor.'
            : err.message
          : 'Error carregant personal disponible.'
      setError(message)
      setResponsables([])
      setConductors([])
      setTreballadors([])
    } finally {
      isFetchingRef.current = false
      setLoading(false)
    }
  }, [
    opts.departament,
    opts.startDate,
    opts.endDate,
    opts.startTime,
    opts.endTime,
    opts.excludeIds?.join(','), // ✅ evita dependències infinites
    session?.accessToken,
  ])

  useEffect(() => {
    fetchPersonnel()
  }, [fetchPersonnel])

  return {
    responsables,
    conductors,
    treballadors,
    loading,
    error,
    refetchPersonnel: fetchPersonnel,
  }
}
