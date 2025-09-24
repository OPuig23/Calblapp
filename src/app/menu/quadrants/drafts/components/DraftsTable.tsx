// file: src/app/menu/quadrants/drafts/components/DraftsTable.tsx
'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useAvailablePersonnel } from '@/app/menu/quadrants/[id]/hooks/useAvailablePersonnel'

// Subcomponents
import DraftRow from './DraftRow'
import RowEditor from './RowEditor'
import DraftActions from './DraftActions'

import type { Role } from './types'
import type { DraftInput, Row } from './types'

export default function DraftsTable({ draft }: { draft: DraftInput }) {
  const { data: session } = useSession()
  const department = (
    draft.department || (session as any)?.user?.department || ''
  ).toLowerCase()

  // --- Construcció inicial de files a partir del draft (incloent brigades)
  const initialRows: Row[] = [
    ...(draft.responsableName
      ? [{
          id: draft.responsable?.id || '',
          name: draft.responsableName,
          role: 'responsable' as Role,
          startDate: draft.startDate,
          endDate: draft.endDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          meetingPoint: draft.responsable?.meetingPoint || '',
          plate: draft.responsable?.plate || '',
          vehicleType: draft.responsable?.vehicleType || '',
        }]
      : []),
    ...(draft.conductors || []).map(c => ({
      id: c.id || '',
      name: c.name,
      role: 'conductor' as Role,
      startDate: draft.startDate,
      endDate: draft.endDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      meetingPoint: c.meetingPoint || '',
      plate: c.plate || '',
      vehicleType: c.vehicleType || '',
    })),
    ...(draft.treballadors || []).map(t => ({
      id: t.id || '',
      name: t.name,
      role: 'treballador' as Role,
      startDate: draft.startDate,
      endDate: draft.endDate,
      startTime: draft.startTime,
      endTime: draft.endTime,
      meetingPoint: t.meetingPoint || '',
      plate: '',
      vehicleType: '',
    })),
    ...(draft.brigades || []).map(b => ({
      id: b.id || '',
      name: b.name || '',
      role: 'brigada' as Role,
      startDate: b.startDate || draft.startDate,
      endDate: b.endDate || draft.endDate,
      startTime: b.startTime || draft.startTime,
      endTime: b.endTime || draft.endTime,
      meetingPoint: draft.meetingPoint || '',
      workers: b.workers || 0,
      plate: '',
      vehicleType: '',
    })),
  ]

  const [rows, setRows] = useState<Row[]>(initialRows)
  const initialRef = useRef(JSON.stringify(initialRows))
  const dirty = JSON.stringify(rows) !== initialRef.current

  // --- Estat de confirmació
  const [confirmed, setConfirmed] = useState<boolean>(draft.status === 'confirmed')
  const [confirming, setConfirming] = useState(false)
  const isLocked = confirmed || confirming

  // --- Personal disponible
  const available = useAvailablePersonnel({
    departament: department,
    startDate: draft.startDate,
    endDate: draft.endDate,
    startTime: draft.startTime,
    endTime: draft.endTime,
    excludeIds: rows.map(r => r.id).filter(Boolean),
  })

  // --- Comptadors
  const assigned = useMemo(() => ({
    responsables: rows.filter(r => r.role === 'responsable').length,
    conductors:   rows.filter(r => r.role === 'conductor').length,
    treballadors: rows.filter(r => r.role === 'treballador').length,
    brigades:     rows.filter(r => r.role === 'brigada').length,
  }), [rows])

  const requested = useMemo(() => ({
    responsables: draft.responsablesNeeded || 1,
    conductors:   draft.numDrivers || 0,
    treballadors: draft.totalWorkers || 0,
    brigades:     (draft.brigades || []).length,
  }), [draft])

  // --- Callbacks (API routes)
  const handleSaveAll = async () => {
    try {
      const res = await fetch('/api/quadrantsDraft/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
          rows, // 👈 totes les files juntes
        }),
      })

      if (!res.ok) throw new Error('Error en desar quadrant')
      alert('✅ Quadrant desat correctament')
    } catch (err) {
      console.error('Error desa quadrant', err)
      alert('❌ Error en desar quadrant')
    }
  }

  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/quadrantsDraft/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
        }),
      })
      if (!res.ok) throw new Error('Error confirmant quadrant')
      const data = await res.json()
      if (data.ok) {
        setConfirmed(true)
        alert('✅ Quadrant confirmat correctament i notificacions enviades')
      } else {
        alert('⚠️ No s’ha pogut confirmar')
      }
    } catch (e) {
      console.error('Error confirmant quadrant', e)
      alert('❌ Error confirmant quadrant')
    }
  }

  const handleUnconfirm = async () => {
    try {
      const res = await fetch('/api/quadrantsDraft/unconfirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
        }),
      })
      if (!res.ok) throw new Error('Error reobrint quadrant')
      setConfirmed(false)
      alert('🔓 Quadrant reobert')
    } catch (err) {
      console.error('Error reobrint quadrant', err)
      alert('❌ Error reobrint quadrant')
    }
  }

  const handleDeleteQuadrant = async () => {
    if (!confirm('Segur que vols eliminar aquest quadrant?')) return
    try {
      const res = await fetch('/api/quadrantsDraft/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: draft.department,
          eventId: draft.id,
          rows,
        }),
      })
      if (!res.ok) throw new Error('Error eliminant quadrant')
      alert('🗑️ Quadrant eliminat correctament')
    } catch (err) {
      console.error('Error eliminant quadrant', err)
      alert('❌ Error eliminant quadrant')
    }
  }

  const [editIdx, setEditIdx] = useState<number | null>(null)
  const startEdit = (i: number) => setEditIdx(i)
  const endEdit = () => setEditIdx(null)
  const patchRow = (patch: Partial<Row>) =>
    setRows(rs => rs.map((r, idx) => idx === editIdx ? { ...r, ...patch } as Row : r))

  const revertRow = () => {
    if (editIdx === null) return
    setRows(rs => {
      const copy = [...rs]
      copy[editIdx] = initialRows[editIdx] // torna a l’estat inicial
      return copy
    })
    setEditIdx(null)
  }

  return (
    <div className="w-full rounded-2xl border bg-white shadow">
      {/* Capçalera de columnes */}
      <div
        className="grid border-b bg-gray-50 text-xs font-semibold text-gray-600 px-1 py-2 items-center"
        style={{ gridTemplateColumns: '32px 1fr 5.5rem 5.5rem minmax(10rem,1fr) minmax(10rem,1fr) auto' }}
      >
        <div></div> {/* Icona */}
        <div>Nom / Brigada</div>
        <div>Data</div>
        <div>Hora</div>
        <div>Meeting point</div>
        <div>Vehicle / Nº persones</div>
        <div className="flex justify-end gap-1">
          <DraftActions
            confirmed={confirmed}
            confirming={confirming}
            dirty={dirty}
            onConfirm={handleConfirm}
            onUnconfirm={handleUnconfirm}
            onSave={handleSaveAll}
            onDelete={handleDeleteQuadrant}
          />
        </div>
      </div>

      {/* Files */}
      <div className="flex flex-col divide-y">
        {rows.map((r, i) => (
          <React.Fragment key={`${r.role}-${r.id || 'noid'}-${i}`}>
            <DraftRow
              row={r}
              isLocked={isLocked}
              onEdit={() => startEdit(i)}
              onDelete={() => setRows(rs => rs.filter((_, idx) => idx !== i))}
            />
            {editIdx === i && (
              <RowEditor
                row={r}
                available={available}
                onPatch={patchRow}
                onClose={endEdit}
                onRevert={revertRow}
                isLocked={isLocked}
              />
            )}
          </React.Fragment>
        ))}

        {/* Fila inferior: missatge i botons */}
        <div
          className="grid items-center border-b px-1 py-3 bg-gray-50"
          style={{
            gridTemplateColumns:
              '32px 1fr 5.5rem 5.5rem minmax(10rem,1fr) minmax(10rem,1fr) 3.5rem',
          }}
        >
          <div></div>
          <div className="col-span-3">
            {dirty ? (
              <span className="text-yellow-700 text-sm flex items-center gap-2">
                ⚠️ Tens canvis sense desar
              </span>
            ) : (
              <span className="text-gray-500 italic text-sm">
                Afegir nou participant o brigada:
              </span>
            )}
          </div>

          <div className="flex gap-2 col-span-2 justify-end">
            <button
              onClick={() =>
                setRows([...rows, {
                  id: '',
                  name: '',
                  role: 'responsable',
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  meetingPoint: '',
                  plate: '',
                  vehicleType: '',
                }])
              }
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
            >
              + Responsable
            </button>
            <button
              onClick={() =>
                setRows([...rows, {
                  id: '',
                  name: '',
                  role: 'conductor',
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  meetingPoint: '',
                  plate: '',
                  vehicleType: '',
                }])
              }
              className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200"
            >
              + Conductor
            </button>
            <button
              onClick={() =>
                setRows([...rows, {
                  id: '',
                  name: '',
                  role: 'treballador',
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  meetingPoint: '',
                  plate: '',
                  vehicleType: '',
                }])
              }
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
            >
              + Treballador
            </button>
            <button
              onClick={() =>
                setRows([...rows, {
                  id: '',
                  name: '',
                  role: 'brigada',
                  startDate: draft.startDate,
                  endDate: draft.endDate,
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  meetingPoint: draft.meetingPoint || '',
                  workers: 0,
                  plate: '',
                  vehicleType: '',
                }])
              }
              className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200"
            >
              + Brigada
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
