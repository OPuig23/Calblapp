// src/hooks/useReportOptions.ts
import useSWR from 'swr'

export interface ReportOptions {
  departments:  string[]
  roles:        string[]
  events:       string[]
  responsibles: string[]
  lines:        string[]
}

export function useReportOptions() {
  const { data, error } = useSWR<ReportOptions>('/api/reports/options', async url => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to load report options')
    return res.json()
  })

  return {
    options: data ?? {
      departments: [], roles: [], events: [], responsibles: [], lines: []
    },
    loading: !error && !data,
    error
  }
}
