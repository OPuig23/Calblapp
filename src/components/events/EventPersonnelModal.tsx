'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** ───────────────── Types ───────────────── */
interface Person {
  id?: string
  name?: string
  role?: 'responsable' | 'conductor' | 'treballador'
  phone?: string
  department?: string
  meetingPoint?: string
  time?: string
}

interface EventPersonnelModalProps {
  open: boolean
  onClose: () => void
  eventName: string
  code?: string
  responsable?: Person | null
  conductors?: Person[]
  treballadors?: Person[]
  loading?: boolean   // 👈 afegit aquí
}

/** ───────────────── Helpers ───────────────── */
function roleIcon(role?: string) {
  const r = (role || '').toLowerCase()
  if (r === 'responsable') return '🎓'
  if (r === 'conductor') return '🚗'
  return '👤'
}

function parseEventTitle(summary: string) {
  if (!summary) return { name: '', ln: '', code: '' }

  const parts = summary.split('-').map(p => p.trim())

  let ln = ''
  if (summary.startsWith('E-') || summary.startsWith('E -')) ln = 'Empresa'
  else if (summary.startsWith('C-') || summary.startsWith('C -')) ln = 'Casaments'
  else if (summary.startsWith('F-') || summary.startsWith('F -')) ln = 'Foodlovers'
  else if (summary.startsWith('PM')) ln = 'Agenda'
  else ln = 'Altres'

  const name = parts.length > 1 ? parts[1] : summary

  // Captura el codi darrere del "#"
  const match = summary.match(/#\s*([A-Z]\d+)/)
  const code = match ? match[1] : ''

  return { name, ln, code }
}

function groupByDepartment(workers: Person[]) {
  const map = new Map<string, Person[]>()
  workers.forEach(w => {
    let dep = (w.department || '').trim()
    if (!dep) dep = 'Sense departament'
    const pretty = dep.charAt(0).toUpperCase() + dep.slice(1)
    if (!map.has(pretty)) map.set(pretty, [])
    map.get(pretty)!.push(w)
  })
  return Array.from(map.entries())
}

/** ───────────────── Component ───────────────── */
export default function EventPersonnelModal({
  open,
  onClose,
  eventName,
  code,
  responsable,
  conductors = [],
  treballadors = [],
  loading = false,
}: EventPersonnelModalProps) {
  if (!open) return null

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Personal assignat
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Carregant personal…</p>
        </DialogContent>
      </Dialog>
    )
  }

  const allWorkers: Person[] = [
    ...(responsable ? [{ ...responsable, role: 'responsable' }] : []),
    ...conductors.map(c => ({ ...c, role: 'conductor' as const })),
    ...treballadors.map(t => ({ ...t, role: 'treballador' as const })),
  ]

  const grouped = groupByDepartment(allWorkers)
  const { name, ln, code: parsedCode } = parseEventTitle(eventName)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {name} – {ln}
          </DialogTitle>
          <div className="text-sm text-gray-600">LLISTAT DE PERSONAL</div>
          {(parsedCode || code) && (
            <div className="text-xs text-gray-400">
              Codi: {parsedCode || code}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {allWorkers.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-3">
              Sense personal assignat en aquest esdeveniment.
            </div>
          ) : (
            grouped.map(([dep, list]) => (
              <div key={dep} className="mb-3">
                <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                  {dep}
                </div>
                <ul className="divide-y divide-gray-100 border rounded-lg">
                  {list.map((w, i) => (
                    <li
                      key={w.id || `${i}-${w.name}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 px-2 text-xs sm:text-sm gap-1"
                    >
                      {/* ── Esquerra: icona + nom ── */}
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span>{roleIcon(w.role)}</span>
                        <span className="font-medium truncate">{w.name || '—'}</span>
                      </div>

                      {/* ── Centre: meeting point + hora ── */}
                      <div className="flex flex-wrap gap-2 text-gray-600">
                        {w.meetingPoint && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Convoc: {w.meetingPoint}
                          </span>
                        )}
                        {w.time && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            {w.time}
                          </span>
                        )}
                      </div>

                      {/* ── Dreta: telèfon només si és responsable ── */}
                      {w.role === 'responsable' ? (
                        <div className="text-gray-600 min-w-[100px] text-right">
                          {w.phone || '—'}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs">—</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
