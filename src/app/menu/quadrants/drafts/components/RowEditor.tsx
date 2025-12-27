// file: src/app/menu/quadrants/drafts/components/RowEditor.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Row } from './types'
import brigades from '@/data/brigades.json'

type AvailablePerson = {
  id: string
  name: string
  alias?: string
  meetingPoint?: string
}

type AvailableVehicle = {
  id: string
  plate: string
  type: string
  available: boolean
}

type AvailableData = {
  responsables?: AvailablePerson[]
  conductors?: AvailablePerson[]
  treballadors?: AvailablePerson[]
  vehicles?: AvailableVehicle[]
}

type RowEditorProps = {
  row: Row
  available: AvailableData
  onPatch: (patch: Partial<Row>) => void
  onClose: () => void
  onRevert?: () => void
  isLocked: boolean
}

/* ──────────────────────────────
   Hook: detecta si és desktop
   (>= 768px, breakpoint md)
────────────────────────────── */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)

    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}

const normalizeType = (t?: string) => {
  const val = (t || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
  if (!val) return ''
  if (val.includes('petit')) return 'camiopetit'
  if (val.includes('gran')) return 'camiogran'
  if (val.includes('furgo')) return 'furgoneta'
  return val
}

/* ──────────────────────────────
   Subcomponents comuns
────────────────────────────── */

function EditorHeader({
  row,
  onClose,
  onRevert,
  isLocked,
  compact,
}: {
  row: Row
  onClose: () => void
  onRevert?: () => void
  isLocked: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`mb-3 flex items-center justify-between ${
        compact ? 'gap-2' : ''
      }`}
    >
      <h3 className="text-sm font-semibold text-gray-700">
        ✏️ Editant {row.role}: {row.name || '—'}
      </h3>
      <div className="flex gap-2">
        {onRevert && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRevert}
            disabled={isLocked}
          >
            Desfés
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onClose}>
          Tanca
        </Button>
      </div>
    </div>
  )
}

function EditorFields({
  row,
  available,
  onPatch,
  isLocked,
}: {
  row: Row
  available: AvailableData
  onPatch: (patch: Partial<Row>) => void
  isLocked: boolean
}) {
  const list: AvailablePerson[] =
    row.role === 'responsable'
      ? available?.responsables || []
      : row.role === 'conductor'
      ? available?.conductors || []
      : available?.treballadors || []

  // --- BRIGADA ---
  if (row.role === 'brigada') {
    return (
      <div className="space-y-3">
        {/* Selecció brigada */}
        <div>
          <label className="text-xs font-medium">Brigada</label>
          <select
            value={row.id || ''}
            onChange={(e) => {
              const sel = brigades.find((b) => b.id === e.target.value)
              onPatch({
                id: sel?.id || '',
                name: sel?.name || '',
              })
            }}
            className="w-full rounded border px-2 py-1 text-sm"
            disabled={isLocked}
          >
            <option value="">— Selecciona brigada —</option>
            {brigades.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Nº treballadors */}
        <div>
          <label className="text-xs font-medium">Nº treballadors</label>
          <Input
            type="number"
            value={row.workers || 0}
            onChange={(e) => onPatch({ workers: Number(e.target.value) })}
            disabled={isLocked}
          />
        </div>

        {/* Hores */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs">Hora inici brigada</label>
            <Input
              type="time"
              value={row.startTime || ''}
              onChange={(e) => onPatch({ startTime: e.target.value })}
              disabled={isLocked}
            />
          </div>
          <div>
            <label className="text-xs">Hora fi brigada</label>
            <Input
              type="time"
              value={row.endTime || ''}
              onChange={(e) => onPatch({ endTime: e.target.value })}
              disabled={isLocked}
            />
          </div>
        </div>
      </div>
    )
  }

  // --- RESPONSABLE / CONDUCTOR / TREBALLADOR ---
  return (
    <>
      {/* NOM + MEETING POINT */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Nom</label>
          <select
            value={row.id || ''}
            onChange={(e) => {
              const sel = list.find((p) => p.id === e.target.value)
              const displayName = sel?.name || sel?.alias || sel?.id || ''
              onPatch({ id: sel?.id || '', name: displayName })
              if (sel?.meetingPoint)
                onPatch({ meetingPoint: sel.meetingPoint })
            }}
            className="w-full rounded border px-2 py-1 text-sm"
            disabled={isLocked}
          >
            <option value="">Selecciona {row.role}</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.alias || p.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium">Lloc convocatòria</label>
          <Input
            value={row.meetingPoint || ''}
            onChange={(e) => onPatch({ meetingPoint: e.target.value })}
            placeholder="Lloc…"
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
      </div>

      {/* Vehicle (només conductors) */}
      {row.role === 'conductor' && (
        <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Tipus de vehicle</label>
            <select
              value={row.vehicleType || ''}
              onChange={(e) =>
                onPatch({ vehicleType: e.target.value, plate: '' })
              }
              className="w-full rounded border px-2 py-1 text-sm"
              disabled={isLocked}
            >
              <option value="">— Selecciona tipus —</option>
              <option value="camioPetit">Camió petit</option>
              <option value="furgoneta">Furgoneta</option>
              <option value="camioGran">Camió gran</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium">Matrícula</label>
            <select
              value={row.plate || ''}
              onChange={(e) => onPatch({ plate: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
              disabled={isLocked || !row.vehicleType}
            >
              <option value="">— Selecciona matrícula —</option>
              {(available?.vehicles || [])
                .filter(
                  (v) =>
                    v.available &&
                    (!row.vehicleType ||
                      normalizeType(v.type) === normalizeType(row.vehicleType))
                )
                .map((v) => (
                  <option key={v.id} value={v.plate}>
                    {v.plate}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium">Hora d'arribada</label>
            <Input
              type="time"
              value={row.arrivalTime || ''}
              onChange={(e) => onPatch({ arrivalTime: e.target.value })}
              className="w-full text-sm"
              disabled={isLocked}
            />
          </div>
        </div>
      )}

      {/* Dates i hores */}
      <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-5">
        <div>
          <label className="text-xs">Data inici</label>
          <Input
            type="date"
            value={row.startDate}
            onChange={(e) => onPatch({ startDate: e.target.value })}
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="text-xs">Hora inici</label>
          <Input
            type="time"
            value={row.startTime}
            onChange={(e) => onPatch({ startTime: e.target.value })}
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="text-xs">Data fi</label>
          <Input
            type="date"
            value={row.endDate}
            onChange={(e) => onPatch({ endDate: e.target.value })}
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="text-xs">Hora fi</label>
          <Input
            type="time"
            value={row.endTime}
            onChange={(e) => onPatch({ endTime: e.target.value })}
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="text-xs">Hora arribada</label>
          <Input
            type="time"
            value={row.arrivalTime || ''}
            onChange={(e) => onPatch({ arrivalTime: e.target.value })}
            className="w-full text-sm"
            disabled={isLocked}
          />
        </div>
      </div>
    </>
  )
}

/* ──────────────────────────────
   Component principal
────────────────────────────── */
export default function RowEditor(props: RowEditorProps) {
  const { row, available, onPatch, onClose, onRevert, isLocked } = props
  const isDesktop = useIsDesktop()

  const content = (
    <>
      <EditorHeader
        row={row}
        onClose={onClose}
        onRevert={onRevert}
        isLocked={isLocked}
        compact={!isDesktop}
      />
      <EditorFields
        row={row}
        available={available}
        onPatch={onPatch}
        isLocked={isLocked}
      />
    </>
  )

  // Desktop / mobile render
  if (isDesktop) {
    return (
      <div className="col-span-full border-t bg-gray-50 px-4 py-3">
        {content}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-h-[90vh] rounded-t-3xl bg-white p-4 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto max-w-md space-y-3">{content}</div>
      </div>
    </div>
  )
}
