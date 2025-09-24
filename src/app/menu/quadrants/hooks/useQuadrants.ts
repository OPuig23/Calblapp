// src/app/menu/quadrants/hooks/useQuadrants.ts
import { useEffect, useState } from 'react'

export function useQuadrants(
  department: string,
  start?: string,
  end?: string,
  status: 'all' | 'confirmed' | 'draft' = 'all'   // 🔑 afegit
) {
  const [quadrants, setQuadrants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (department) params.set('department', department)
      if (start)      params.set('start', start)
      if (end)        params.set('end', end)
      if (status)     params.set('status', status)   // 🔑 enviar status a l’API

      const url = `/api/quadrants/list?${params.toString()}`
      console.log('[useQuadrants] Fetch URL=', url) // 🔎 debug

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setQuadrants(json.drafts ?? json.quadrants ?? [])
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [department, start, end, status])

  return { quadrants, loading, error, reload: fetchData }
}
