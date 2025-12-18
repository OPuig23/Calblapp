//file:/src/app/menu/logistica/assignacions/hooks/useTransportAssignments.ts
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useTransportAssignments(start: string, end: string) {
  const key = start && end ? `/api/transports/assignacions?start=${start}&end=${end}` : null
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: false })

  return {
    items: (data?.items || []) as any[],
    loading: isLoading,
    error,
    refetch: mutate,
  }
}
