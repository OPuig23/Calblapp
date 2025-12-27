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
import { checkNameExists, generateSuggestions } from '@/lib/validateName'

// Opcions de rol permeses
const ROLE_OPTIONS = [
  { value: 'soldat', label: 'Soldat' },
  { value: 'responsable', label: 'Responsable' },
]

// Normalització rol
function normalizeRoleLocal(r?: string) {
  const v = (r || '').toLowerCase()
  return v === 'responsable' ? 'responsable' : 'soldat'
}

// Slug senzill
function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ID auto
function randSuffix(len = 4) {
  return Math.random().toString(36).slice(2, 2 + len)
}
function generateIdFromName(name: string) {
  const base = slugify(name) || 'persona'
  return `${base}-${randSuffix()}`
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

  const [autoId, setAutoId] = useState(true)

  const [form, setForm] = useState<NewPerson>({
    id: '',
    name: '',
    role: 'soldat',
    department: defaultDepartment,
    driver: { isDriver: false, camioGran: false, camioPetit: false },
    available: true,
    email: '',
    phone: '',
    maxHoursWeek: 40,
  })

  const [nameError, setNameError] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Reinici al obrir modal
  useEffect(() => {
    if (isOpen) {
      setAutoId(true)
      setForm({
        id: '',
        name: '',
        role: 'soldat',
        department: defaultDepartment,
        driver: { isDriver: false, camioGran: false, camioPetit: false },
        available: true,
        email: '',
        phone: '',
        maxHoursWeek: 40,
      })
      setNameError(false)
      setSuggestions([])
    }
  }, [isOpen, defaultDepartment])

  // Actualitza ID automàticament
  useEffect(() => {
    if (autoId) {
      setForm(prev => ({ ...prev, id: generateIdFromName(prev.name) }))
    }
  }, [form.name, autoId])

  // Validar nom
  const validateName = async (v: string) => {
    if (!v.trim()) {
      setNameError(false)
      setSuggestions([])
      return
    }

    const exists = await checkNameExists(v)
    setNameError(exists)

    if (exists) {
      setSuggestions(generateSuggestions(v))
    } else {
      setSuggestions([])
    }
  }

  const handleChange = <K extends keyof NewPerson>(field: K, value: NewPerson[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (nameError) return

    const payload: NewPerson = {
      ...form,
      id: form.id.trim(),
      name: form.name.trim(),
      role: normalizeRoleLocal(form.role),
      department: form.department.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    }

    await mutateAsync(payload)
    onCreated()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nou treballador</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* NOM */}
          <div>
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={form.name}
              onChange={async (e) => {
                const v = e.target.value
                handleChange('name', v)
                await validateName(v)
              }}
              required
              className={nameError ? 'border-red-500' : ''}
            />

            {nameError && (
              <div className="mt-1 text-red-600 text-sm flex flex-col gap-2">
                <div>⚠️ El nom ja existeix.</div>
                <div className="flex gap-2 flex-wrap">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={async () => {
                        handleChange('name', s)
                        await validateName(s)
                      }}
                      className="px-2 py-1 bg-gray-100 rounded-lg text-xs border hover:bg-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ID AUTO */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="id">ID (auto)</Label>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setForm(prev => ({ ...prev, id: generateIdFromName(prev.name) }))}
              >
                Regenera
              </Button>
            </div>
            <Input id="id" value={form.id} disabled className="bg-gray-100" />
            <p className="text-xs text-gray-500">L’ID també s’utilitzarà per crear l’usuari.</p>
          </div>

          {/* ROL */}
          <div>
            <Label>Rol</Label>
            <select
              value={form.role}
              onChange={e => handleChange('role', e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* DEPARTAMENT */}
          <div>
            <Label>Departament</Label>
            <Input value={form.department} disabled className="bg-gray-100" />
          </div>

          {/* CONDUCTOR */}
          <div>
            <Label>És conductor?</Label>
            <select
              value={form.driver?.isDriver ? 'si' : 'no'}
              onChange={(e) =>
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

          {/* TIPUS VEHICLE */}
          {form.driver?.isDriver && (
            <div>
              <Label>Tipus de vehicle</Label>
              <div className="flex flex-col gap-2 mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.driver.camioGran}
                    onChange={(e) =>
                      handleChange('driver', { ...form.driver, camioGran: e.target.checked })
                    }
                  />
                  Camió gran
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.driver.camioPetit}
                    onChange={(e) =>
                      handleChange('driver', { ...form.driver, camioPetit: e.target.checked })
                    }
                  />
                  Camió petit
                </label>
              </div>
            </div>
          )}

          {/* DISPONIBLE */}
          <div>
            <Label>Disponible</Label>
            <select
              value={form.available ? 'si' : 'no'}
              onChange={e => handleChange('available', e.target.value === 'si')}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* CONTACTE */}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
            />
          </div>

          <div>
            <Label>Telèfon</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
            />
          </div>

          {/* HORES SETMANALS */}
          <div>
            <Label>Hores màximes per setmana</Label>
            <Input
              type="number"
              min={0}
              value={form.maxHoursWeek}
              onChange={e => handleChange('maxHoursWeek', Number(e.target.value))}
            />
          </div>

          {/* BOTONS */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>

            <Button
              type="submit"
              disabled={isCreating || nameError}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? 'Creant…' : 'Crear'}
            </Button>
          </div>

          {error && <p className="text-red-600 mt-2">{error}</p>}
        </form>
      </DialogContent>
    </Dialog>
  )
}
