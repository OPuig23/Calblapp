'use client'

import React, { useState } from 'react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'

export default function PlantillaNewPage() {
  const [name, setName] = useState('')
  const [periodicity, setPeriodicity] = useState('monthly')
  const [lastDone, setLastDone] = useState('')
  const [location, setLocation] = useState('')
  const [primaryOperator, setPrimaryOperator] = useState('')
  const [backupOperator, setBackupOperator] = useState('')
  const [saving, setSaving] = useState(false)

  const create = async () => {
    if (!name.trim()) {
      alert('Omple el nom de la plantilla.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/maintenance/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          periodicity,
          lastDone: lastDone || null,
          location,
          primaryOperator,
          backupOperator,
          sections: [],
        }),
      })
      if (!res.ok) throw new Error('create_failed')
      const json = await res.json().catch(() => null)
      const id = json?.id ? String(json.id) : null
      if (id) {
        const win = window.open(`/menu/manteniment/preventius/plantilles/${id}`, '_blank', 'noopener')
        if (win) win.opener = null
      }
      window.close()
    } catch {
      alert('No s’ha pogut crear la plantilla.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-3xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Nova plantilla" />

        <div className="rounded-2xl border bg-white p-4 space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Nom</span>
            <input
              className="h-10 rounded-xl border px-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Temporalitat</span>
              <select
                className="h-10 rounded-xl border px-3"
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value)}
              >
                <option value="daily">Diari</option>
                <option value="weekly">Setmanal</option>
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Ultima data revisio</span>
              <input
                type="date"
                className="h-10 rounded-xl border px-3"
                value={lastDone}
                onChange={(e) => setLastDone(e.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">Ubicacio</span>
            <input
              className="h-10 rounded-xl border px-3"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Operari assignat</span>
              <input
                className="h-10 rounded-xl border px-3"
                value={primaryOperator}
                onChange={(e) => setPrimaryOperator(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-600">Segon operari</span>
              <input
                className="h-10 rounded-xl border px-3"
                value={backupOperator}
                onChange={(e) => setBackupOperator(e.target.value)}
              />
            </label>
          </div>

          <div className="text-xs text-gray-500">
            La definicio del checklist (seccions i tasques) la podras editar dins la plantilla un cop creada.
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
              disabled={saving}
              onClick={create}
            >
              {saving ? 'Creant...' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}
