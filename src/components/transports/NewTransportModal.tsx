// File: src/components/transports/NewTransportModal.tsx
'use client'

import React, { useState, useEffect, FormEvent, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateTransport } from '@/hooks/useCreateTransport'
import { usePersonnel } from '@/hooks/usePersonnel'

type TransportType = 'camioPetit' | 'camioGran' | 'furgoneta'

const isTransportType = (v: string): v is TransportType =>
  v === 'camioPetit' || v === 'camioGran' || v === 'furgoneta'

const TYPE_OPTIONS: Array<{ value: TransportType; label: string }> = [
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'furgoneta', label: 'Furgoneta' },
]

interface Personnel {
  id: string
  name: string
  driver?: { camioGran?: boolean; camioPetit?: boolean }
}

interface Transport {
  id?: string
  plate: string
  type: TransportType
  conductorId?: string | null
  available?: boolean
}

interface NewTransportModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  defaultValues?: Transport | null
}

export default function NewTransportModal({
  isOpen,
  onOpenChange,
  onCreated,
  defaultValues = null,
}: NewTransportModalProps) {
  const { mutateAsync, loading, error } = useCreateTransport()
  const { data: personnel } = usePersonnel()

  const isEditMode = !!defaultValues

  const [plate, setPlate] = useState('')
  const [type, setType] = useState<TransportType>('camioPetit')
  const [conductorId, setConductorId] = useState<string>('')

  // 🔄 Quan s’obre, carrega valors si s’està editant
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && defaultValues) {
        setPlate(defaultValues.plate || '')
        setType(defaultValues.type || 'camioPetit')
        setConductorId(defaultValues.conductorId || '')
      } else {
        setPlate('')
        setType('camioPetit')
        setConductorId('')
      }
    }
  }, [isOpen, defaultValues, isEditMode])

  // 🔎 Filtra conductors segons tipus
  const availableDrivers = useMemo(() => {
    if (!personnel) return []
    if (type === 'camioGran') {
      return personnel.filter((p) => p.driver?.camioGran)
    }
    if (type === 'camioPetit' || type === 'furgoneta') {
      return personnel.filter((p) => p.driver?.camioPetit)
    }
    return []
  }, [type, personnel])

  // 💾 Guardar / Actualitzar transport
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      plate: plate.trim(),
      type,
      conductorId: conductorId || null,
    }

    try {
      if (isEditMode && defaultValues?.id) {
        const res = await fetch(`/api/transports/${defaultValues.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Error actualitzant transport')
      } else {
        await mutateAsync(payload)
      }

      onCreated()
      onOpenChange(false)
    } catch (err) {
      console.error('❌ Error desant transport:', err)
      alert('No s’ha pogut desar el vehicle.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar transport' : 'Nou transport'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Matrícula */}
          <div>
            <Label htmlFor="plate">Matrícula</Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="Ex: 1234-ABC"
              required
            />
          </div>

          {/* Tipus */}
          <div>
            <Label htmlFor="type">Tipus</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                const v = e.target.value
                if (isTransportType(v)) setType(v)
              }}
              className="border rounded px-2 py-1 w-full"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div>
            <Label htmlFor="conductorId">Conductor (opcional)</Label>
            <select
              id="conductorId"
              value={conductorId}
              onChange={(e) => setConductorId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">— Sense conductor assignat —</option>
              {availableDrivers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Botons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading
                ? 'Desant…'
                : isEditMode
                ? 'Desar canvis'
                : 'Afegir transport'}
            </Button>
          </div>

          {error && <p className="text-red-600">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
