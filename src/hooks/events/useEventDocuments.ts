// src/hooks/events/useEventDocuments.ts
'use client'

import { useEffect, useState } from 'react'

export type EventDoc = {
  id: string
  title: string
  mimeType?: string
  source: 'calendar-attachment' | 'description-link'
  url: string
  previewUrl?: string
  icon: 'pdf'|'doc'|'sheet'|'slide'|'img'|'link'
}

export default function useEventDocuments(eventId?: string) {
  const [docs, setDocs] = useState<EventDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`/api/events/${eventId}/documents`)
      .then(r => r.json())
      .then(j => { if (alive) setDocs(Array.isArray(j.docs) ? j.docs : []) })
      .catch(e => { if (alive) setError(String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [eventId])

  return { docs, loading, error }
}
