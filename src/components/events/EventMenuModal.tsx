'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Users,
  AlertTriangle,
  Eye,
  FileSignature,
  FileBarChart2,
} from 'lucide-react'
import CreateIncidentModal from '../incidents/CreateIncidentModal'
import EventDocumentsSheet from '@/components/events/EventDocumentsSheet'
import EventPersonnelModal from './EventPersonnelModal'
import { useEventPersonnel } from '@/hooks/useEventPersonnel'
import EventIncidentsModal from './EventIncidentsModal'
import EventModificationsModal from './EventModificationsModal'
import CreateModificationModal from './CreateModificationModal'

/** ───────────────────────── Helpers ───────────────────────── */
const norm = (s?: string | number | null) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

type LnKey = 'empresa' | 'casaments' | 'foodlovers' | 'agenda' | 'altres'

interface WorkerLite {
  id?: string | number
  name?: string
  role?: string
  department?: string
}

interface EventMenuModalProps {
  event: {
    id?: string | number
    summary: string
    start: string
    lnKey?: LnKey
    isResponsible?: boolean
    responsable?: WorkerLite | null
    conductors?: WorkerLite[]
    treballadors?: WorkerLite[]
  }
  user: {
    id?: string | number
    role?: string
    department?: string
    name?: string
  }
  onClose: () => void
}

function deduceLnKeyFromSummary(summary: string): LnKey {
  const s = summary.trim().toUpperCase()
  if (s.startsWith('E-')) return 'empresa'
  if (s.startsWith('C-')) return 'casaments'
  if (s.startsWith('F-')) return 'foodlovers'
  if (s.startsWith('PM')) return 'agenda'
  return 'altres'
}

/** ───────────────────────── Component ───────────────────────── */
export default function EventMenuModal({ event, user, onClose }: EventMenuModalProps) {
  const router = useRouter()
  const [showCreateIncident, setShowCreateIncident] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [showPersonnel, setShowPersonnel] = useState(false)
  const { data: personnelData, loading: personnelLoading } = useEventPersonnel(event.id)
  const [showIncidents, setShowIncidents] = useState(false)
  const [showModifications, setShowModifications] = useState(false)
  const [showCreateModification, setShowCreateModification] = useState(false)

  if (!event || !event.id) return null

  const roleN = norm(user?.role)
  const deptN = norm(user?.department)
  const lnKey: LnKey = event.lnKey ?? deduceLnKeyFromSummary(event.summary)

  const isAdmin = roleN === 'admin'
  const isDireccio = roleN === 'direccio'
  const isCapDept =
    roleN === 'cap' || (roleN.includes('cap') && roleN.includes('depart'))

  const canSeeIncidents = isAdmin || isDireccio || isCapDept

  const canCreateIncident =
    isAdmin ||
    isDireccio ||
    (isCapDept &&
      ['foodlovers', 'logistica', 'cuina', 'serveis'].includes(norm(deptN))) ||
    (roleN === 'treballador' && event.isResponsible)

  const DEPT_TO_LN: Record<string, LnKey> = {
    empresa: 'empresa',
    casaments: 'casaments',
    foodlovers: 'foodlovers',
    agenda: 'agenda',
  }
  const deptNoBudget = new Set(['serveis', 'logistica', 'logística', 'cuina'])
  const canSeeBudgetContract =
    isAdmin ||
    isDireccio ||
    (isCapDept && !deptNoBudget.has(deptN) && DEPT_TO_LN[deptN] === lnKey)

  const navigateTo = (path: string) => {
    onClose()
    router.push(path)
  }

  const canSeeModifications =
    isAdmin ||
    isDireccio ||
    (isCapDept && ['logistica', 'cuina', 'produccio'].includes(norm(deptN)))

  const canCreateModification =
    isAdmin ||
    isDireccio ||
    (isCapDept && ['logistica', 'cuina', 'produccio'].includes(norm(deptN)))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl"
          aria-label="Tancar"
        >
          ✕
        </button>

        <h2 className="font-bold text-lg mb-2">{event.summary}</h2>
        <p className="text-gray-600 text-sm mb-1">
          Data: {event.start.substring(0, 10)}
        </p>

        <div className="space-y-2 mt-2">
          {canCreateIncident && (
            <button
              type="button"
              className="w-full py-2 rounded bg-orange-400 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => setShowCreateIncident(true)}
            >
              <AlertTriangle className="w-5 h-5" /> Crear incidència
            </button>
          )}

          {canSeeIncidents && (
            <button
              className="w-full py-2 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => setShowIncidents(true)}
            >
              <Eye className="w-5 h-5" /> Veure incidències
            </button>
          )}

          {canCreateModification && (
            <button
              className="w-full py-2 rounded bg-purple-400 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => setShowCreateModification(true)}
            >
              ✏️ Registrar modificació
            </button>
          )}

          {canSeeModifications && (
            <button
              className="w-full py-2 rounded bg-purple-200 hover:bg-purple-300 text-purple-900 font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => setShowModifications(true)}
            >
              📝 Veure modificacions
            </button>
          )}

          <button
            className="w-full py-2 rounded bg-blue-400 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition"
            onClick={() => setShowPersonnel(true)}
          >
            <Users className="w-5 h-5" /> Veure personal assignat
          </button>

          <button
            className="w-full py-2 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold flex items-center justify-center gap-2 transition"
            onClick={() => setDocsOpen(true)}
          >
            <FileText className="w-5 h-5" /> Veure documents
          </button>

          {canSeeBudgetContract && (
            <button
              className="w-full py-2 rounded bg-green-200 hover:bg-green-300 text-green-900 font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => navigateTo(`/menu/events/${event.id}/contract`)}
            >
              <FileSignature className="w-5 h-5 text-slate-600" /> Veure contracte
            </button>
          )}

          {canSeeBudgetContract && (
            <button
              className="w-full py-2 rounded bg-purple-200 hover:bg-purple-300 text-purple-900 font-semibold flex items-center justify-center gap-2 transition"
              onClick={() => navigateTo(`/menu/events/${event.id}/budget`)}
            >
              <FileBarChart2 className="w-5 h-5 text-slate-600" /> Veure pressupost
            </button>
          )}
        </div>

        {/* ─────────── MODALS INTERNES ─────────── */}
        {showCreateIncident && (
          <CreateIncidentModal
            event={event}
            user={user}
            onClose={() => setShowCreateIncident(false)}
            onCreated={() => setShowCreateIncident(false)}
          />
        )}

        <EventPersonnelModal
          open={showPersonnel}
          onClose={() => setShowPersonnel(false)}
          eventName={event.summary}
          code={String(event.id)}
          responsable={personnelData?.responsables?.[0]}
          conductors={personnelData?.conductors}
          treballadors={personnelData?.treballadors}
          loading={personnelLoading}
        />

        <EventIncidentsModal
          open={showIncidents}
          onClose={() => setShowIncidents(false)}
          eventId={String(event.id)}
          eventSummary={event.summary}
        />

        <EventModificationsModal
          open={showModifications}
          onClose={() => setShowModifications(false)}
          eventId={String(event.id)}
          eventSummary={event.summary}
        />

        {showCreateModification && (
          <CreateModificationModal
            event={event}
            user={user}
            onClose={() => setShowCreateModification(false)}
            onCreated={() => setShowCreateModification(false)}
          />
        )}
      </div>

      <EventDocumentsSheet
        eventId={String(event.id)}
        open={docsOpen}
        onOpenChange={setDocsOpen}
      />
    </div>
  )
}
