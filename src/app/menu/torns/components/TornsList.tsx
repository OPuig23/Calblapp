// filename: src/app/menu/torns/components/TornsList.tsx
'use client'

import React from 'react'
import TornCard, { TornCardItem } from './TornCard'
import TornCardWorker from './TornCardWorker'
import { Users, Calendar } from 'lucide-react'

type Props = {
  items?: TornCardItem[]
  onTornClick?: (t: TornCardItem) => void
  groupByEvent?: boolean
  role?: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador'
  filters?: {
    workerName?: string | null
    roleType?: string | null
  }
}

const formatDate = (iso: string) => {
  if (!iso || iso.length < 10) return iso || ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y.slice(2)}`
}

const weekdayLong = (iso: string) => {
  const d = new Date(iso)
  const arr = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds']
  return isNaN(d.getTime()) ? '' : arr[d.getDay()]
}

const norm = (s?: string | null) =>
  String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

function mergeGroup(arr: TornCardItem[]): TornCardItem {
  const base = arr[0]
  const baseId = (base.id || '').split(':')[0] || base.id

  const byKey = new Map<
    string,
    { id?: string; name?: string; role?: string; startTime?: string; endTime?: string; meetingPoint?: string }
  >()

  const push = (w?: {
  id?: string
  name?: string
  role?: string
  startTime?: string
  endTime?: string
  meetingPoint?: string
}) => {
  if (!w) return
  const key = w.id ? String(w.id) : norm(w.name)
  if (!key) return
  const existing = byKey.get(key)

  if (!existing) {
    byKey.set(key, {
      id: w.id,
      name: w.name,
      role: w.role,
      startTime: w.startTime,
      endTime: w.endTime,
      meetingPoint: w.meetingPoint,
    })
  } else {
    // ✅ respectem la prioritat: responsable > conductor > treballador
    const priority = { responsable: 3, conductor: 2, treballador: 1, null: 0 }
    const newPriority = priority[w.role as keyof typeof priority] || 0
    const oldPriority = priority[existing.role as keyof typeof priority] || 0

    if (newPriority > oldPriority) {
      byKey.set(key, { ...existing, role: w.role })
    }
  }
}


  for (const t of arr) {
    t.__rawWorkers?.forEach(push)
    if (t.workerName) push({ id: t as any as string, name: t.workerName, role: t.workerRole })
  }

  const workers = Array.from(byKey.values())

  console.log('[mergeGroup result]', {
    event: base.eventName,
    workers,
  })

  const parseStart = (s?: string) => (s || '').split('-')[0]?.trim() || ''
  const parseEnd = (s?: string) => (s || '').split('-')[1]?.trim() || ''
  const starts = arr.map((t) => parseStart(t.time)).filter(Boolean).sort()
  const ends = arr.map((t) => parseEnd(t.time)).filter(Boolean).sort()
  const aggTime = starts.length && ends.length ? `${starts[0]} - ${ends[ends.length - 1]}` : base.time

  return {
    ...base,
    id: baseId,
    time: aggTime,
    workerName: workers.length === 1 ? workers[0].name : undefined,
    workerRole: workers.length === 1 ? workers[0].role || null : null,  // 👈 ara conserva el rol si només hi ha un
    __rawWorkers: workers,
  }
}

export default function TornsList({
  items = [],
  onTornClick,
  groupByEvent = false,
  role = 'Treballador',
  filters,
}: Props) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, TornCardItem[]>()
    for (const it of items) {
      const k = (it.date || '').slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(it)
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a.time || '').localeCompare(b.time || ''))

      if (groupByEvent) {
        const byEvent = new Map<string, TornCardItem[]>()
        for (const t of arr) {
          const key =
  t.eventId || `${t.code || ''}|${t.eventName || ''}|${t.location || ''}`

          if (!byEvent.has(key)) byEvent.set(key, [])
          byEvent.get(key)!.push(t)
        }
        const merged = Array.from(byEvent.values()).map(mergeGroup)
        map.set(k, merged)
      }
    }

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [items, groupByEvent])

  if (!items.length) {
    return (
      <p className="text-center py-12 text-gray-400">
        No tens torns en aquest rang.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dayIso, dayItems]) => {
        const total = dayItems.length
        return (
          <section key={dayIso} className="mb-6">
            <header className="flex items-center justify-between mb-3 bg-green-50 p-3 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {weekdayLong(dayIso)} {formatDate(dayIso)}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <Calendar className="w-3 h-3" />
                  {total} torn{total !== 1 && 's'}
                </span>
              </h2>
              <span className="flex items-center gap-1 text-pink-600 font-bold">
                <Users className="w-4 w-4" />
                {total}
              </span>
            </header>

            <div className="flex flex-col gap-3">
              {dayItems.map((t) => {
                const showWorkerView =
                  role === 'Treballador' ||
                  (!!filters?.workerName && filters?.workerName !== '__all__') ||
                  (!!filters?.roleType && filters?.roleType !== 'all')

                return (
                  <div
                    key={t.id}
                    className="relative"
                    onClick={() => onTornClick?.(t)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onTornClick?.(t)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {showWorkerView ? (
                      <>
                        {console.log('[RENDER] TornCardWorker', {
                          id: t.id,
                          workerName: t.workerName,
                          workerRole: t.workerRole,
                          eventName: t.eventName,
                        })}
                        <TornCardWorker item={t} />
                      </>
                    ) : (
                      <>
                        {console.log('[RENDER] TornCard', {
                          id: t.id,
                          eventName: t.eventName,
                        })}
                        <TornCard item={t} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
