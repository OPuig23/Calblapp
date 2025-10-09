// file: src/app/menu/quadrants/drafts/page.tsx
'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar from '@/components/layout/FiltersBar'
import QuadrantsDayGroup from './components/QuadrantsDayGroup'
import { ArrowLeft } from 'lucide-react'

export interface Draft {
  id: string
  code: string
  eventName: string
  department?: string
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  location?: string | { [key: string]: unknown }
  totalWorkers?: number
  numDrivers?: number
  responsableId?: string
  responsableName?: string | { [key: string]: unknown }
  conductors?: Array<string | { [key: string]: unknown }>
  treballadors?: Array<string | { [key: string]: unknown }>
  updatedAt?: string
  status?: 'draft' | 'confirmed'
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/* ──────────────────────────────
   Helpers
────────────────────────────── */
const normalizeName = (v: unknown): string => {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const candidate =
      (v as Record<string, unknown>).name ??
      (v as Record<string, unknown>).fullName ??
      (v as Record<string, unknown>).displayName ??
      (v as Record<string, unknown>).label ??
      (v as Record<string, unknown>).text
    if (typeof candidate === 'string') return candidate
  }
  return ''
}

const sameName = (a: unknown, bLC: string) => {
  const n = normalizeName(a).trim().toLowerCase()
  return !!n && n === bLC
}

const normalizeLocation = (v: unknown): string => {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const c =
      (v as Record<string, unknown>).address ??
      (v as Record<string, unknown>).location ??
      (v as Record<string, unknown>).text ??
      (v as Record<string, unknown>).label ??
      (v as Record<string, unknown>).name
    if (typeof c === 'string') return c
  }
  return ''
}

const locationTag = (v: unknown): string => {
  const raw = normalizeLocation(v).trim()
  if (!raw) return ''
  const comma = raw.indexOf(',')
  let end = comma >= 0 ? comma : raw.length
  if (end > 20) end = 20
  return raw.slice(0, end).trim()
}

/* ──────────────────────────────
   Component principal
────────────────────────────── */
export default function DraftsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const searchParams = useSearchParams()

  // 🔹 Llegeix els paràmetres de la URL i inicialitza el rang de dates
  const params = new URLSearchParams(searchParams.toString())
  const startParam = params.get('start')
  const endParam = params.get('end')

  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    if (startParam && endParam) return [startParam, endParam]
    const today = format(new Date(), 'yyyy-MM-dd')
    return [today, today]
  })

  const norm = (s: unknown) =>
    (s ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const role = norm(session?.user?.role)
  const userDept = norm(session?.user?.department)
  const canSelectDepartment = ['admin', 'direccio', 'direccion'].includes(role)

  const [department, setDepartment] = useState<string>(
    canSelectDepartment ? '' : userDept || ''
  )
  const [person, setPerson] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [status, setStatus] = useState<'all' | 'draft' | 'confirmed'>('all')

  /* ──────────────────────────────
     API i dades
  ─────────────────────────────── */
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      start: dateRange[0],
      end: dateRange[1],
    })
    const depLC = (department || '').toLowerCase().trim()
    if (depLC) params.set('department', depLC)
    if (status !== 'all') params.set('status', status)
    return `/api/quadrants/list?${params.toString()}`
  }, [dateRange, department, status])

  const { data, isLoading, error } = useSWR(apiUrl, fetcher)
  const drafts: Draft[] = useMemo(() => data?.drafts || [], [data])

  /* ──────────────────────────────
     Agrupacions i opcions
  ─────────────────────────────── */
  const statusOptions = useMemo(() => {
    const s = new Set<'draft' | 'confirmed'>()
    drafts.forEach((d) => {
      const v = String(d.status || '').toLowerCase()
      if (v === 'draft' || v === 'confirmed') s.add(v as 'draft' | 'confirmed')
    })
    return s.size
      ? Array.from(s)
      : (['draft', 'confirmed'] as Array<'draft' | 'confirmed'>)
  }, [drafts])

  const personnelOptions = useMemo(() => {
    const names: string[] = []
    for (const d of drafts) {
      const resp = normalizeName(d.responsableName).trim()
      if (resp) names.push(resp)
      if (Array.isArray(d.conductors))
        d.conductors.forEach((x) => {
          const n = normalizeName(x).trim()
          if (n) names.push(n)
        })
      if (Array.isArray(d.treballadors))
        d.treballadors.forEach((x) => {
          const n = normalizeName(x).trim()
          if (n) names.push(n)
        })
    }
    return Array.from(new Set(names.map((n) => n.toLowerCase()))).map(
      (n) => names.find((orig) => orig.toLowerCase() === n)!
    )
  }, [drafts])

  const locationOptions = useMemo(() => {
    const tags: string[] = []
    drafts.forEach((d) => {
      const t = locationTag(d.location)
      if (t) tags.push(t)
    })
    return Array.from(new Set(tags.map((t) => t.toLowerCase()))).map(
      (n) => tags.find((orig) => orig.toLowerCase() === n)!
    )
  }, [drafts])

  /* ──────────────────────────────
     Filtres i canvis
  ─────────────────────────────── */
  const onFilter = (f: {
    dateRange?: [string, string]
    department?: string | null
    person?: string | null
    location?: string | null
    status?: 'all' | 'draft' | 'confirmed'
  }) => {
    if (f.dateRange) setDateRange(f.dateRange)
    if (typeof f.department !== 'undefined')
      setDepartment((f.department || '').trim().toLowerCase())
    if (typeof f.person !== 'undefined') setPerson(f.person || '')
    if (typeof f.location !== 'undefined') setLocation(f.location || '')
    if (typeof f.status !== 'undefined') setStatus(f.status)
  }

  const headerDept = canSelectDepartment
    ? department
      ? cap(department)
      : 'Tots'
    : userDept
    ? cap(userDept)
    : 'Tots'

  /* ──────────────────────────────
     Render
  ─────────────────────────────── */
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/menu/quadrants')}
          className="flex items-center gap-2 text-blue-700 hover:underline text-sm"
        >
          <ArrowLeft size={18} /> Torna als Quadrants
        </button>
      </div>

      <ModuleHeader
        icon="📋"
        title="EDICIÓ DE QUADRANTS"
        subtitle={`Consulta i gestiona els quadrants – ${headerDept}`}
      />

      {/* 🔹 Mostra el filtre només quan hi ha rang definit */}
      {dateRange && (
        <FiltersBar
          filters={{
            start: dateRange[0],
            end: dateRange[1],
          }}
          setFilters={(f) => {
            if (f.start && f.end) setDateRange([f.start, f.end])
          }}
        />
      )}

      {isLoading && <p className="text-gray-500">Carregant quadrants…</p>}
      {error && <p className="text-red-600">{String(error)}</p>}
      {!isLoading && !error && drafts.length === 0 && (
        <p>No hi ha quadrants per mostrar.</p>
      )}

      {!isLoading && !error && drafts.length > 0 && (
        <div className="space-y-6">
          {drafts.map((d) => (
            <QuadrantsDayGroup
              key={d.startDate}
              date={d.startDate}
              quadrants={[d]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
