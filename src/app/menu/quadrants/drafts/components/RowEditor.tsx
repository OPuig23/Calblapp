// file:src/app/menu/quadrants/drafts/components/RowEditor.tsx
'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Row } from './types'
import brigades from '@/data/brigades.json'

type RowEditorProps = {
  row: Row
  available: any
  onPatch: (patch: Partial<Row>) => void
  onClose: () => void
  onRevert?: () => void
  isLocked: boolean
}

export default function RowEditor({
  row,
  available,
  onPatch,
  onClose,
  onRevert,
  isLocked,
}: RowEditorProps) {
  const list =
    row.role === 'responsable'
      ? available?.responsables || []
      : row.role === 'conductor'
      ? available?.conductors || []
      : available?.treballadors || []

  return (
    <div className="col-span-full border-t bg-gray-50 px-4 py-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
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

      {/* --- BRIGADA --- */}
      {row.role === 'brigada' ? (
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
          <div className="grid grid-cols-2 gap-3">
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
      ) : (
        <>
          {/* --- NOM + MEETING POINT --- */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Nom</label>
              <select
                value={row.id || ''}
                onChange={(e) => {
                  const sel = list.find((p: any) => p.id === e.target.value)
                  const displayName = sel?.name || sel?.alias || sel?.id || ''
                  onPatch({ id: sel?.id || '', name: displayName })
                  if (sel?.meetingPoint)
                    onPatch({ meetingPoint: sel.meetingPoint })
                }}
                className="w-full rounded border px-2 py-1 text-sm"
                disabled={isLocked}
              >
                <option value="">Selecciona {row.role}</option>
                {list.map((p: any) => (
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
                className="w-full text-xs"
                disabled={isLocked}
              />
            </div>
          </div>

          {/* Vehicle (només conductors) */}
          {row.role === 'conductor' && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
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
                      (v: any) =>
                        v.available &&
                        v.type?.toLowerCase() ===
                          row.vehicleType?.toLowerCase()
                    )
                    .map((v: any) => (
                      <option key={v.id} value={v.plate}>
                        {v.plate}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Dates i hores */}
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div>
              <label className="text-xs">Data inici</label>
              <Input
                type="date"
                value={row.startDate}
                onChange={(e) => onPatch({ startDate: e.target.value })}
                className="w-full text-xs"
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="text-xs">Hora inici</label>
              <Input
                type="time"
                value={row.startTime}
                onChange={(e) => onPatch({ startTime: e.target.value })}
                className="w-full text-xs"
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="text-xs">Data fi</label>
              <Input
                type="date"
                value={row.endDate}
                onChange={(e) => onPatch({ endDate: e.target.value })}
                className="w-full text-xs"
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="text-xs">Hora fi</label>
              <Input
                type="time"
                value={row.endTime}
                onChange={(e) => onPatch({ endTime: e.target.value })}
                className="w-full text-xs"
                disabled={isLocked}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
