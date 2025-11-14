//filename:src\hooks\useTransports.ts
'use client'
import useSWR from 'swr'

export interface Transport {
  id: string
  plate: string
  type: 'camioGran' | 'camioPetit' | 'furgoneta'
  conductorId?: string | null
  available: boolean
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error carregant dades')
  return res.json() as Promise<Transport[]>
}

export function useTransports() {
  const { data, error, mutate } = useSWR<Transport[]>('/api/transports', fetcher)

  // 🔀 Ordenem: disponibles primer, després no disponibles
  const sorted = data
    ? [...data].sort((a, b) => {
        if (a.available === b.available) return a.plate.localeCompare(b.plate)
        return a.available ? -1 : 1
      })
    : []

  return {
    data: sorted,
    isLoading: !data && !error,
    error,
    refetch: mutate,
  }
}

export async function createTransport(newTransport: Omit<Transport, 'id'>) {
  const res = await fetch('/api/transports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTransport),
  })
  if (!res.ok) throw new Error('Error afegint transport')
  return res.json()
}
