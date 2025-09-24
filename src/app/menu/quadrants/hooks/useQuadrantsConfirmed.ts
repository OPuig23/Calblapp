// Path: src/app/menu/quadrants/hooks/useQuadrantsConfirmed.ts
'use client'

import useSWR from 'swr'
import axios from 'axios'

export interface ConfirmedQuadrant {
  id: string
  code: string
  eventName: string
  department: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

// Fetcher amb try/catch que retorna array buit en cas d'error
export default function confirmedFetcher(url: string): Promise<ConfirmedQuadrant[]> {
  return axios
    .get(url)
    .then(res => (res.data.quadrants as ConfirmedQuadrant[]) || [])
    .catch(err => {
      console.error('Error fetching confirmed quadrants:', err)
      return []
    })
}

export function useQuadrantsConfirmed() {
  const { data, error, isLoading, mutate } = useSWR<ConfirmedQuadrant[]>(
    '/api/quadrants/list',
    confirmedFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  return {
    confirmed: data || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  }
}
