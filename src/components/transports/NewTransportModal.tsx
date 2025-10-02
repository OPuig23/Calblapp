// File: src/components/transports/NewTransportModal.tsx
'use client'

import React, { useState, FormEvent, useMemo } from 'react'
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

// 🔒 Tipus fort per al select de tipus
type TransportType = 'camioPetit' | 'camioGran' | 'furgoneta'

// Type guard per validar valors del select
const isTransportType = (v: string): v is TransportType =>
  v === 'camioPetit' || v === 'camioGran' || v === 'furgoneta'

const TYPE_OPTIONS: Array<{ value: TransportType; label: string }> = [
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'furgoneta', label: 'Furgoneta' },
]

interface NewTransportModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export default function NewTransportModal({
  isOpen,
  onOpenChange,
  onCreated,
}: NewTransportModalProps) {
  const { mutateAsync, loading, error } = useCreateTransport()
  const { data: personnel } = usePersonnel()

  const [plate, setPlate] = useState('')
  const [type, setType] = useState<TransportType>('camioPetit')
  const [conductorId, setConductorId] = useState<string>('')

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      plate: plate.trim(),
      type,
      conductorId: conductorId || null,
    }

    await mutateAsync(payload)
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nou transport</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plate">Matrícula</Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlate(e.target.value)}
              placeholder="Ex: 1234-ABC"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipus</Label>
            <select
              id="type"
              value={type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value
                if (isTransportType(v)) setType(v) // ✅ sense any
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

          {/* ➕ Conductor opcional */}
          <div>
            <Label htmlFor="conductorId">Conductor (opcional)</Label>
            <select
              id="conductorId"
              value={conductorId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConductorId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">— Sense conductor assignat —</option>
              {availableDrivers.map((p: Personnel) => (
  <option key={p.id} value={p.id}>
    {p.name}
  </option>
))}

            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creant…' : 'Afegir transport'}
            </Button>
          </div>

          {error && <p className="text-red-600">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
