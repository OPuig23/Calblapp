//file:/src/app/menu/logistica/assignacions/page.tsx
'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar, { type FiltersState } from '@/components/layout/FiltersBar'
import { useTransportAssignments } from './hooks/useTransportAssignments'
import TransportAssignmentCard from './components/TransportAssignmentCard'

const normalize = (v?: string) =>
  (v || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

export default function TransportAssignacionsPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const role = normalize((session?.user as any)?.role)
  const dept = normalize((session?.user as any)?.department)

  const hasAccess =
    role === 'admin' ||
    role === 'direccio' ||
    role === 'direccion' ||
    (role === 'cap' && dept === 'transports') ||
    dept === 'transports'

  const initialFilters: FiltersState = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 })
    const e = endOfWeek(new Date(), { weekStartsOn: 1 })
    return { start: format(s, 'yyyy-MM-dd'), end: format(e, 'yyyy-MM-dd'), mode: 'week' }
  }, [])

  const [filters, setFilters] = useState<FiltersState>(initialFilters)

  const { items, loading, error, refetch } = useTransportAssignments(filters.start, filters.end)

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const it of items) {
      const day = it.day || 'sense-data'
      if (!map[day]) map[day] = []
      map[day].push(it)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  if (!hasAccess) {
    return <main className="p-6 text-red-600 font-semibold">Accés restringit</main>
  }

  return (
    <main className="space-y-6 px-4 pb-12">
      <button
        onClick={() => router.push('/menu/transports')}
        className="flex items-center gap-2 text-blue-700 hover:underline text-sm"
      >
        <ArrowLeft size={18} /> Torna a Transports
      </button>

      <ModuleHeader
        icon="🚚"
        title="Assignacions de Transport"
        subtitle="Vehicles i conductors per esdeveniment"
      />

      <FiltersBar
        filters={filters}
        setFilters={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
      />

      {loading && (
        <p className="text-center text-gray-500 py-10">Carregant assignacions…</p>
      )}

      {error && (
        <p className="text-center text-red-600 py-10">{String(error)}</p>
      )}

      {!loading && !error && grouped.length === 0 && (
        <p className="text-center text-gray-400 py-10">
          Cap esdeveniment amb demanda/assignació en aquest rang.
        </p>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([day, evs]) => (
            <section key={day} className="space-y-2">
              <div className="font-semibold text-emerald-800 bg-emerald-50 border rounded-xl px-3 py-2">
                {day}
              </div>

              <div className="space-y-2">
                {evs.map((ev) => (
                  <TransportAssignmentCard key={ev.eventCode} item={ev} onChanged={refetch} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
