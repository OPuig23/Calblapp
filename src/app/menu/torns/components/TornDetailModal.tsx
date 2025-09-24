// filename: src/app/menu/torns/components/TornDetailModal.tsx
'use client'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
/** ───────────────────────── Types ───────────────────────── */
export interface Worker {
  id?: string
  name?: string
  role?: string
  startTime?: string
  endTime?: string
  meetingPoint?: string
  department?: string
}
export interface TornDetailModalProps {
  open: boolean
  onClose: () => void
  torn: {
    id: string
    eventName: string
    code?: string
    __rawWorkers?: Worker[]
  } | null
  role?: 'Admin' | 'Direcció' | 'Cap Departament' | 'Treballador'
}
/** ───────────────────────── Helpers ───────────────────────── */
const log = (...args: any[]) => console.log('[TornDetailModal]', ...args)
function cleanEventName(s?: string) {
  if (!s) return ''
  return s.replace(/^[A-Z]\s*-\s*/i, '').trim()
}
function timeRange(a?: string, b?: string) {
  const left = (a || '').trim()
  const right = (b || '').trim()
  if (left && right) return `${left} - ${right}`
  return left || right || ''
}
function roleIcon(role?: string) {
  const r = String(role || '').toLowerCase()
  if (r === 'responsable') return '🎓'
  if (r === 'conductor') return '🚗'
  return '👤'
}
function groupByDepartment(workers: Worker[]) {
  const map = new Map<string, Worker[]>()
  workers.forEach(w => {
    let dep = (w.department || '').trim()
    if (!dep) dep = 'Sense departament'

    // 👇 Capitalitzem la primera lletra
    const pretty = dep.charAt(0).toUpperCase() + dep.slice(1)

    // 🔎 Log quirúrgic
    console.log('[groupByDepartment]', {
      worker: w.name,
      originalDep: w.department,
      normalizedDep: dep,
      prettyDep: pretty,
    })

    if (!map.has(pretty)) map.set(pretty, [])
    map.get(pretty)!.push(w)
  })

  return Array.from(map.entries())
}
/** ───────────────────────── Component ───────────────────────── */
export default function TornDetailModal({ open, onClose, torn, role }: TornDetailModalProps) {
  if (!torn) return null

  const workers: Worker[] = Array.isArray(torn.__rawWorkers) ? torn.__rawWorkers : []

  log('torn:', torn, 'workers:', workers.length)

// agrupació sempre per departament
const grouped = groupByDepartment(workers)
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Detall del torn
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Capçalera esdeveniment ── */}
          <div>
            <div className="font-medium text-gray-900">
              {cleanEventName(torn.eventName)}
            </div>
            {torn.code && (
              <div className="text-xs text-gray-400">{torn.code}</div>
            )}
          </div>

          {/* ── Llistat ── */}
          {workers.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-3">
              Sense treballadors assignats en aquest torn.
            </div>
          ) : (
            grouped.map(([dep, list]) => (
              <div key={dep} className="mb-3">
                {dep && (
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                    {dep}
                  </div>
                )}
                <ul className="divide-y divide-gray-100 border rounded-lg">
                  {list.map((w, i) => {
                    const icon = roleIcon(w.role)
                    const displayTime = timeRange(w.startTime, w.endTime)
                    const displayPoint = (w.meetingPoint || '').trim()
                    return (
                      <li
                        key={w.id || `${i}-${w.name || 'unknown'}`}
                        className="flex items-center justify-between py-1.5 px-2 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <span>{icon}</span>
                          <span className="font-medium truncate">
                            {w.name || '—'}
                          </span>
                        </div>
                        <div className="text-gray-600 min-w-[80px] text-center">
                          {displayTime || '—'}
                        </div>
                        <div className="text-gray-500 truncate max-w-[120px] text-right">
                          {displayPoint || '—'}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
