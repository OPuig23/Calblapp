// file: src/components/events/EventIncidentsModal.tsx
'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIncidents } from '@/hooks/useIncidents'

interface Props {
  open: boolean
  onClose: () => void
  eventId: string
  eventSummary?: string
}

function importanceColor(level: string) {
  const norm = (level || '').toLowerCase()
  if (norm === 'alta') return 'bg-red-50 text-red-700 border border-red-200'
  if (norm === 'mitjana') return 'bg-orange-50 text-orange-700 border border-orange-200'
  if (norm === 'baixa') return 'bg-green-50 text-green-700 border border-green-200'
  return 'bg-gray-50 text-gray-600 border border-gray-200'
}

// 🔎 Helper per netejar i extreure dades de l’event
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

export default function EventIncidentsModal({ open, onClose, eventId, eventSummary = '' }: Props) {
  const { incidents, loading, error } = useIncidents({ eventId })
  const { name, ln, code } = parseEventTitle(eventSummary)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {name} – {ln}
          </DialogTitle>
          <div className="text-sm text-gray-600">LLISTAT D’INCIDÈNCIES</div>
          {(code) && (
            <div className="text-xs text-gray-400">
              Codi: {code}
            </div>
          )}
        </DialogHeader>

        {loading && <p className="text-sm text-gray-500">Carregant incidències…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && incidents.length === 0 && (
          <p className="text-sm text-gray-500">
            No hi ha incidències per aquest esdeveniment.
          </p>
        )}

        {!loading && incidents.length > 0 && (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {incidents.map((i) => (
              <div
                key={i.id}
                className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm"
              >
                {/* ── Descripció ── */}
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {i.description}
                </div>

                {/* ── Autor ── */}
                {i.createdBy && (
                  <div className="text-xs text-gray-600 mb-2">
                    Usuari: <span className="font-semibold">{i.createdBy}</span>
                  </div>
                )}

                {/* ── Info addicional ── */}
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  {i.department && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                      {i.department}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${importanceColor(
                      i.importance
                    )}`}
                  >
                    {i.importance}
                  </span>
                  {i.category && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {i.category.id} - {i.category.label}
                    </span>
                  )}
                </div>

                {/* ── Data ── */}
                <div className="text-xs text-gray-400">
                  {new Date(i.createdAt).toLocaleString('ca-ES')}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
