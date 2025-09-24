// File: src/app/menu/quadrants/[id]/hooks/useAvailablePersonnel.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function useAvailablePersonnel(opts: UseAvailablePersonnelOptions) {
  const [responsables, setResponsables] = useState<PersonnelOption[]>([])
  const [conductors, setConductors] = useState<PersonnelOption[]>([])
  const [treballadors, setTreballadors] = useState<PersonnelOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: session } = useSession()

  const fetchPersonnel = useCallback(async () => {
    if (
      !opts.departament ||
      !opts.startDate ||
      !opts.endDate ||
      !opts.startTime ||
      !opts.endTime
    ) {
      setResponsables([]); setConductors([]); setTreballadors([])
      return
    }
    setLoading(true); setError(null)

    try {
      const excl = new Set(
        (opts.excludeIds ?? []).map((id) => id.toLowerCase().trim())
      )

      console.log('[useAvailablePersonnel] INPUT', {
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
      })

      const cleanList = (arr: any[], label: string) => {
        const excluded = arr.filter((p) =>
          excl.has(p.id.toLowerCase().trim())
        )
        if (excluded.length) {
          console.log(`[useAvailablePersonnel] LOCAL EXCLUDE ${label}:`, excluded.map(e => e.name))
        }

        const out = arr
          .filter((p) => !excl.has(p.id.toLowerCase().trim()))
          .map((p) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            status: p.status as 'available' | 'conflict' | 'notfound',
            reason: p.reason,
          }))

        console.log(`[useAvailablePersonnel] CLEAN ${label}`, {
          total: arr.length,
          afterExclude: out.length,
          excluded: arr.length - out.length,
        })
        return out
      }

      setResponsables(cleanList(res.data.responsables || [], 'responsables'))
      setConductors(cleanList(res.data.conductors || [], 'conductors'))
      setTreballadors(cleanList(res.data.treballadors || [], 'treballadors'))
    } catch (err: any) {
      console.error('[useAvailablePersonnel] ERROR', err)
      setError(err.message || 'Error carregant personal')
      setResponsables([]); setConductors([]); setTreballadors([])
    } finally {
      setLoading(false)
    }
  }, [
    opts.departament, opts.startDate, opts.endDate,
    opts.startTime, opts.endTime,
    JSON.stringify(opts.excludeIds),
    session?.accessToken,
  ])

  useEffect(() => { fetchPersonnel() }, [fetchPersonnel])

  return { responsables, conductors, treballadors, loading, error, refetchPersonnel: fetchPersonnel }
}
