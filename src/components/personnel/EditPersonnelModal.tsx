// File: src/components/personnel/EditPersonnelModal.tsx
'use client'

import React, { useState, useEffect, FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useUpdatePersonnel } from '@/hooks/useUpdatePersonnel'
import { usePersonnel, Personnel } from '@/hooks/usePersonnel'

interface EditPersonnelModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  person: Personnel
}

// Opcions de rol permeses
const ROLE_OPTIONS = [
  { value: 'soldat',      label: 'Soldat' },
  { value: 'responsable', label: 'Responsable' },
]

// Normalització/validació del rol
function normalizeRoleLocal(r?: string) {
  const v = (r || '').toLowerCase()
  return v === 'responsable' ? 'responsable' : 'soldat'
}

export default function EditPersonnelModal({
  isOpen,
  onOpenChange,
  onSaved,
  person
}: EditPersonnelModalProps) {
  const { mutateAsync, loading: isSaving, error } = useUpdatePersonnel()
  usePersonnel() // per mantenir coherència d’estat global

  // Estat del formulari
  const [form, setForm] = useState<Personnel>({
    ...person,
    role: normalizeRoleLocal(person.role),
    maxHoursWeek: person.maxHoursWeek ?? 40,
    driver: person.driver ?? { isDriver: false, camioGran: false, camioPetit: false },
    available: person.available ?? true,
  })

  // Sincronitza quan s’obre o canvia el person
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...person,
        role: normalizeRoleLocal(person.role),
        maxHoursWeek: person.maxHoursWeek ?? 40,
        driver: person.driver ?? { isDriver: false, camioGran: false, camioPetit: false },
        available: person.available ?? true,
      })
    }
  }, [isOpen, person])

  const handleChange = <K extends keyof Personnel>(field: K, value: Personnel[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const payload: Personnel = {
        ...form,
        role: normalizeRoleLocal(form.role),
      }
      await mutateAsync(payload)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error('Error actualitzant personal:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {person.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ID (no editable) */}
          <div>
            <Label htmlFor="id">ID (Nom)</Label>
            <Input id="id" value={form.id} disabled className="bg-gray-100" />
          </div>

          {/* Nom complet */}
          <div>
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
            />
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              value={normalizeRoleLocal(form.role)}
              onChange={e => handleChange('role', e.target.value as any)}
              required
              className="border rounded px-2 py-1 w-full"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Departament (no editable) */}
          <div>
            <Label htmlFor="department">Departament</Label>
            <Input
              id="department"
              value={form.department}
              disabled
              className="bg-gray-100"
            />
          </div>

          {/* ✅ Disponible / No disponible */}
          <div className="flex items-center justify-between">
            <Label htmlFor="available">Disponible</Label>
            <Switch
              id="available"
              checked={form.available ?? true}
              onCheckedChange={(val) => handleChange('available', val)}
            />
          </div>

          {/* És conductor */}
          <div>
            <Label htmlFor="isDriver">És conductor?</Label>
            <select
              id="isDriver"
              value={form.driver?.isDriver ? 'si' : 'no'}
              onChange={e =>
                handleChange('driver', {
                  ...form.driver,
                  isDriver: e.target.value === 'si'
                })
              }
              className="border rounded px-2 py-1 w-full"
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Tipus de vehicle */}
          {form.driver?.isDriver && (
            <div>
              <Label>Tipus de vehicle</Label>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.driver?.camioGran || false}
                    onChange={e =>
                      handleChange('driver', { ...form.driver, camioGran: e.target.checked })
                    }
                  />
                  Camió gran
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.driver?.camioPetit || false}
                    onChange={e =>
                      handleChange('driver', { ...form.driver, camioPetit: e.target.checked })
                    }
                  />
                  Camió petit
                </label>
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email || ''}
              onChange={e => handleChange('email', e.target.value)}
            />
          </div>

          {/* Telèfon */}
          <div>
            <Label htmlFor="phone">Telèfon</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone || ''}
              onChange={e => handleChange('phone', e.target.value)}
            />
          </div>

          {/* Hores màximes setmanals */}
          <div>
            <Label htmlFor="maxHoursWeek">Hores màximes per setmana</Label>
            <Input
              id="maxHoursWeek"
              type="number"
              min={0}
              value={form.maxHoursWeek ?? 40}
              onChange={e => handleChange('maxHoursWeek', Number(e.target.value))}
              required
            />
          </div>

          {/* Botons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel·lar
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Guardant…' : 'Guardar'}
            </Button>
          </div>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
