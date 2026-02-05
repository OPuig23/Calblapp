'use client'

import { useEffect, useState } from 'react'

export function useMaintenanceNewCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/maintenance/tickets?status=nou', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Error carregant tickets')
        const data = await res.json()
        const tickets = Array.isArray(data?.tickets) ? data.tickets : []
        if (active) setCount(tickets.length)
      } catch {
        if (active) setCount(0)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return { count, loading }
}
