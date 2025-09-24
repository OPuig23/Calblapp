//file: src\hooks\useTorns.ts
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Filters {
  start?: string
  end?: string
  department?: string
}

export function useTorns(initialFilters: Filters = {}) {
  const { data: session } = useSession()
  const [torns, setTorns] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(initialFilters)

  const fetchData = useCallback(async () => {
    if (!session) return
    const { role, department: userDept, id: userId } = session.user as any

    const params = new URLSearchParams()
    if (filters.start) params.set('start', filters.start)
    if (filters.end)   params.set('end', filters.end)
    if (role === 'Treballador') {
      params.set('userId', userId)
    } else if (role === 'Cap Departament') {
      params.set('department', filters.department || userDept)
    } else if (filters.department) {
      params.set('department', filters.department)
    }

    const endpoint = `/api/torns/getTorns?${params.toString()}`
    try {
      const res = await fetch(endpoint)
      const json = await res.json()
      if (!res.ok) {
        setError(`Error ${res.status}`)
      } else {
        setTorns(json.torns)
        setError(null)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    }
  }, [session, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { torns, error, filters, setFilters }
}
