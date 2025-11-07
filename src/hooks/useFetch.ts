// ✅ file: src/hooks/useFetch.ts
import { useEffect, useState } from 'react'

export default function useFetch(url: string, start?: string, end?: string) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    if (!url) return
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (start) params.set('start', start)
        if (end) params.set('end', end)

        const res = await fetch(`${url}?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json.events || [])
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [url, start, end])

  return { data, loading, error }
}
