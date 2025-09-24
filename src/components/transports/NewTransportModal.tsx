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

const TYPE_OPTIONS = [
  { value: 'camioPetit', label: 'Camió petit' },
  { value: 'camioGran', label: 'Camió gran' },
  { value: 'furgoneta', label: 'Furgoneta' }, // ➕ Nova opció
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
  const [type, setType] = useState<'camioPetit' | 'camioGran' | 'furgoneta'>(
    'camioPetit'
  )
  const [conductorId, setConductorId] = useState<string>('') // 🔄 canviat a conductorId

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
      conductorId: conductorId || null, // 🔄 ara és conductorId
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
              onChange={(e) => setPlate(e.target.value)}
              placeholder="Ex: 1234-ABC"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipus</Label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="border rounded px-2 py-1 w-full"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ➕ Nou camp conductor opcional */}
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
