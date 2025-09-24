// file: src/app/menu/quadrants/drafts/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import DraftsFilters from './components/DraftsFilters'
import QuadrantsDayGroup from './components/QuadrantsDayGroup'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Mode = 'week' | 'day' | 'range'

export interface Draft {
  id: string
  code: string
  eventName: string
  department?: string
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  location?: any
  totalWorkers?: number
  numDrivers?: number
  responsableId?: string
  responsableName?: any
  conductors?: any[]
  treballadors?: any[]
  updatedAt?: string
  status?: 'draft' | 'confirmed'
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// --- helpers
const normalizeName = (v: any): string => {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const candidate = v.name ?? v.fullName ?? v.displayName ?? v.label ?? v.text
    if (typeof candidate === 'string') return candidate
  }
  return ''
}
const sameName = (a: any, bLC: string) => {
  const n = normalizeName(a).trim().toLowerCase()
  return !!n && n === bLC
}
const normalizeLocation = (v: any): string => {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') {
    const c = v.address ?? v.location ?? v.text ?? v.label ?? v.name
    if (typeof c === 'string') return c
  }
  return ''
}
const locationTag = (v: any): string => {
  const raw = normalizeLocation(v).trim()
  if (!raw) return ''
  const comma = raw.indexOf(',')
  let end = comma >= 0 ? comma : raw.length
  if (end > 20) end = 20
  return raw.slice(0, end).trim()
}

export default function DraftsPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const norm = (s: any) =>
    (s ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()

  const role = norm(session?.user?.role)
  const userDept = norm(session?.user?.department)
  const canSelectDepartment = ['admin', 'direccio', 'direccion'].includes(role)

  const [mode, setMode] = useState<Mode>('week')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [department, setDepartment] = useState<string>(
    canSelectDepartment ? '' : userDept || ''
  )
  const [person, setPerson] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [status, setStatus] = useState<'all' | 'draft' | 'confirmed'>('all')

  const apiUrl = useMemo(() => {
    if (!dateRange) return null
    const params = new URLSearchParams({
      start: dateRange[0],
      end: dateRange[1],
    })
    const depLC = (department || '').toLowerCase().trim()
    if (depLC) params.set('department', depLC)
    if (status !== 'all') params.set('status', status)
    return `/api/quadrants/list?${params.toString()}`
  }, [dateRange, department, status])

  const { data, isLoading, error } = useSWR(apiUrl || null, fetcher)
  const drafts: Draft[] = data?.drafts || []

  const statusOptions = useMemo(() => {
    const s = new Set<'draft' | 'confirmed'>()
    drafts.forEach((d) => {
      const v = String(d.status || '').toLowerCase()
      if (v === 'draft' || v === 'confirmed') s.add(v as any)
    })
    return s.size ? Array.from(s) as Array<'draft' | 'confirmed'> : (['draft', 'confirmed'] as const)
  }, [drafts])

  const personnelOptions = useMemo(() => {
    const names: string[] = []
    for (const d of drafts) {
      const resp = normalizeName(d.responsableName).trim()
      if (resp) names.push(resp)
      if (Array.isArray(d.conductors))
        for (const x of d.conductors) {
          const n = normalizeName(x).trim()
          if (n) names.push(n)
        }
      if (Array.isArray(d.treballadors))
        for (const x of d.treballadors) {
          const n = normalizeName(x).trim()
          if (n) names.push(n)
        }
    }
    return Array.from(new Set(names.map(n => n.toLowerCase())))
      .map(n => names.find(orig => orig.toLowerCase() === n)!)
      .sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }))
  }, [drafts])

  const locationOptions = useMemo(() => {
    const tags: string[] = []
    for (const d of drafts) {
      const t = locationTag(d.location)
      if (t) tags.push(t)
    }
    return Array.from(new Set(tags.map(t => t.toLowerCase())))
      .map(n => tags.find(orig => orig.toLowerCase() === n)!)
      .sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }))
  }, [drafts])

  const draftHasPerson = (d: Draft, p: string) => {
    const qLC = p.trim().toLowerCase()
    if (!qLC) return true
    if (sameName(d.responsableName, qLC)) return true
    if (Array.isArray(d.conductors) && d.conductors.some((x) => sameName(x, qLC))) return true
    if (Array.isArray(d.treballadors) && d.treballadors.some((x) => sameName(x, qLC))) return true
    return false
  }
  const draftHasLocation = (d: Draft, tag: string) => {
    const q = tag.trim().toLowerCase()
    if (!q) return true
    const t = locationTag(d.location).toLowerCase()
    return t === q
  }

  // ✅ agrupació per data (com abans)
  const groupedByDate: { date: string; items: Draft[] }[] = useMemo(() => {
    const uniq = Array.from(
      new Map(drafts.map((d) => [`${(d.department || '').toLowerCase()}::${d.id}`, d])).values()
    )
    const filtered = uniq
      .filter((d) => status === 'all' || (d.status || 'draft') === status)
      .filter((d) => draftHasPerson(d, person) && draftHasLocation(d, location))

    const map = new Map<string, Draft[]>()
    for (const d of filtered) {
      const key = d.startDate || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          `${a.startDate || ''}T${a.startTime || ''}`.localeCompare(
            `${b.startDate || ''}T${b.startTime || ''}`
          )
        ),
      }))
  }, [drafts, status, person, location])

  const onFilter = (f: {
    mode?: Mode
    dateRange?: [string, string]
    department?: string | null
    person?: string | null
    location?: string | null
    status?: 'all' | 'draft' | 'confirmed'
  }) => {
    if (f.mode) setMode(f.mode)
    if (f.dateRange) setDateRange(f.dateRange)
    if (typeof f.department !== 'undefined') setDepartment((f.department || '').trim().toLowerCase())
    if (typeof f.person !== 'undefined') setPerson(f.person || '')
    if (typeof f.location !== 'undefined') setLocation(f.location || '')
    if (typeof f.status !== 'undefined') setStatus(f.status)
  }

  const headerDept = canSelectDepartment ? (department ? cap(department) : 'Tots') : userDept ? cap(userDept) : 'Tots'

  return (
    <div className="p-4 space-y-6">
      {/* ✅ Header amb botó tornar */}
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

      <DraftsFilters
        onFilter={onFilter}
        canSelectDepartment={canSelectDepartment}
        userDepartment={canSelectDepartment ? null : userDept}
        personnelOptions={personnelOptions}
        locationOptions={locationOptions}
        status={status}
        statusOptions={statusOptions}
      />

      {isLoading && <p className="text-gray-500">Carregant quadrants…</p>}
      {error && <p className="text-red-600">{String(error)}</p>}
      {!isLoading && !error && groupedByDate.length === 0 && (
        <p>No hi ha quadrants per mostrar.</p>
      )}


{!isLoading && !error && groupedByDate.length > 0 && (
  <div className="space-y-6">
    {groupedByDate.map(({ date, items }) => (
      <QuadrantsDayGroup
        key={date}
        date={date}
        quadrants={items}
      />
    ))}
  </div>
)}

    </div>
  )
}
