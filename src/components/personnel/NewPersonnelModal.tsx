//filename: src/components/personnel/NewPersonnelModal.tsx
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
import { useCreatePersonnel, NewPerson } from '@/hooks/useCreatePersonnel'

// Opcions de rol permeses
const ROLE_OPTIONS = [
  { value: 'soldat',      label: 'Soldat' },
  { value: 'responsable', label: 'Responsable' },
]

// Normalitza/valida rol
function normalizeRoleLocal(r?: string) {
  const v = (r || '').toLowerCase()
  return v === 'responsable' ? 'responsable' : 'soldat'
}

// Slug senzill (sense accents, minúscules, guions)
function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Sufix curt aleatori per evitar col·lisions
function randSuffix(len = 4) {
  return Math.random().toString(36).slice(2, 2 + len)
}

// Genera ID a partir del nom + sufix
function generateIdFromName(name: string) {
  const base = slugify(name) || 'persona'
  return `${base}-${randSuffix()}` // p.ex. 'luis-3f2a'
}

interface NewPersonnelModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  defaultDepartment?: string
}

export default function NewPersonnelModal({
  isOpen,
  onOpenChange,
  onCreated,
  defaultDepartment = ''
}: NewPersonnelModalProps) {
  const { mutateAsync, loading: isCreating, error } = useCreatePersonnel()

  // Mode auto-ID (per defecte true)
  const [autoId, setAutoId] = useState(true)

 const [form, setForm] = useState<NewPerson>({
  id: '',
  name: '',
  role: 'soldat',
  department: defaultDepartment,
  driver: { isDriver: false, camioGran: false, camioPetit: false }, // 👈 important!
  available: true,
  email: '',
  phone: '',
  maxHoursWeek: 40,
})


  // Quan obrim el modal, preparem l’esborrany
  useEffect(() => {
    if (isOpen) {
      setAutoId(true)
      setForm({
        id:         '',
        name:       '',
        role:       'soldat',
        department: defaultDepartment || '',
        driver: { isDriver: false, camioGran: false, camioPetit: false },
        available:  true,
        email:      '',
        phone:      '',
        maxHoursWeek: 40,
      })
    }
  }, [isOpen, defaultDepartment])

  // Si estem en autoId, quan canvia el nom tornem a calcular l’ID
  useEffect(() => {
    if (!autoId) return
    const newId = generateIdFromName(form.name)
    setForm(prev => ({ ...prev, id: newId }))
  }, [form.name, autoId])

  // Re-generar l’ID manualment
  const regenerateId = () => {
    setForm(prev => ({ ...prev, id: generateIdFromName(prev.name) }))
  }

  const handleChange = <K extends keyof NewPerson>(field: K, value: NewPerson[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const payload: NewPerson = {
      ...form,
      id:         (form.id || '').trim(),
      name:       (form.name || '').trim(),
      role:       normalizeRoleLocal(form.role),
      department: (form.department || '').trim(),
      email:      (form.email || '').trim(),
      phone:      (form.phone || '').trim(),
      maxHoursWeek: form.maxHoursWeek ?? 40,
    }

    // Validació mínima
    if (!payload.name) return
    if (!payload.id)   return
    if (!payload.department) return

    await mutateAsync(payload)
    onCreated()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nou treballador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom complet */}
          <div>
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Ex: Luis García"
              required
            />
          </div>

          {/* ID (auto) */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="id">ID (auto)</Label>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={regenerateId}
              >
                Regenera
              </Button>
            </div>
            <Input
              id="id"
              value={form.id}
              disabled
              className="bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Aquest ID s’utilitzarà també per crear l’usuari (coincidència 1:1).
            </p>
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              value={form.role}
              onChange={e => handleChange('role', e.target.value)}
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

          {/* Departament */}
          <div>
            <Label htmlFor="department">Departament</Label>
            <Input
              id="department"
              value={form.department}
              disabled
              className="bg-gray-100"
            />
          </div>

          {/* Conductor */}
          <div>
            <Label htmlFor="isDriver">És conductor?</Label>
            <select
              id="isDriver"
              value={form.driver?.isDriver ? 'si' : 'no'}
              onChange={e =>
                handleChange('driver', {
                  ...(form.driver ?? {}),
                  isDriver: e.target.value === 'si'
                })
              }
              className="border rounded px-2 py-1 w-full"
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Tipus de vehicle (només si és conductor) */}
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

          {/* Disponible */}
          <div>
            <Label htmlFor="available">Disponible</Label>
            <select
              id="available"
              value={form.available ? 'si' : 'no'}
              onChange={e => handleChange('available', e.target.value === 'si')}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Contacte */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Telèfon</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
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
              value={form.maxHoursWeek}
              onChange={e => handleChange('maxHoursWeek', Number(e.target.value))}
              required
            />
          </div>

          {/* Accions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel·lar
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'Creant…' : 'Crear'}
            </Button>
          </div>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
