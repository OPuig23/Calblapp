'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'

type TemplateSection = { location: string; items: { label: string }[] }
type Template = {
  id: string
  name: string
  source: string
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  lastDone?: string | null
  location?: string
  primaryOperator?: string
  backupOperator?: string
  sections: TemplateSection[]
}

const PERIODICITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'daily', label: 'Diari' },
  { value: 'weekly', label: 'Setmanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]

export default function PlantillaDetailPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)

  const [template, setTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState<{
    periodicity?: Template['periodicity']
    lastDone?: string | null
    location?: string
    primaryOperator?: string
    backupOperator?: string
  }>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/maintenance/templates/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = await res.json()
      const found = (json?.template as Template) || null
      setTemplate(found)
      if (found) {
        setForm({
          periodicity: found.periodicity,
          lastDone: found.lastDone || '',
          location: found.location || '',
          primaryOperator: found.primaryOperator || '',
          backupOperator: found.backupOperator || '',
        })
        const nextOpen: Record<string, boolean> = {}
        found.sections.forEach((sec) => {
          nextOpen[sec.location] = false
        })
        setOpenSections(nextOpen)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const loadLastDone = async () => {
      try {
        const res = await fetch(
          `/api/maintenance/preventius/completed?templateId=${encodeURIComponent(id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const json = await res.json()
        const list = Array.isArray(json?.records) ? json.records : []
        const resolved = list.find((r: any) => r.status === 'resolut')
        if (resolved?.completedAt) {
          const date = new Date(resolved.completedAt)
          const yyyy = date.getFullYear()
          const mm = String(date.getMonth() + 1).padStart(2, '0')
          const dd = String(date.getDate()).padStart(2, '0')
          const formatted = `${yyyy}-${mm}-${dd}`
          setForm((prev) => (prev.lastDone ? prev : { ...prev, lastDone: formatted }))
        }
      } catch {
        return
      }
    }
    loadLastDone()
  }, [id])

  const lastDoneRequired = !form.lastDone

  const save = async () => {
    try {
      const res = await fetch(`/api/maintenance/templates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodicity: form.periodicity || null,
          lastDone: form.lastDone || null,
          location: form.location || '',
          primaryOperator: form.primaryOperator || '',
          backupOperator: form.backupOperator || '',
        }),
      })
      if (!res.ok) throw new Error('save_failed')
      setSavedAt(new Date().toISOString())
    } catch {
      return
    }
  }

  const openHistory = () => {
    const url = `/menu/manteniment/preventius/plantilles/${id}/historial`
    const win = window.open(url, '_blank', 'noopener')
    if (win) win.opener = null
  }

  if (!template) {
    return (
      <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
        <div className="p-6 text-sm text-gray-600">Plantilla no trobada.</div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="min-h-screen w-full bg-white flex flex-col">
        <ModuleHeader subtitle={template.name} />

        <div className="border-b px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base font-semibold text-gray-900">{template.name}</div>
          <div className="flex items-center gap-2">
            {savedAt && <div className="text-xs text-emerald-700">Guardat</div>}
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-xs text-gray-600"
              onClick={openHistory}
            >
              Historial
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-0">
            <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto border-b xl:border-b-0 xl:border-r">
              <div className="grid grid-cols-1 gap-4 text-sm pb-24 xl:pb-6">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Temporalitat</span>
                  <select
                    className="h-10 rounded-xl border px-3"
                    value={form.periodicity || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        periodicity: e.target.value as Template['periodicity'],
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {PERIODICITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">
                    Ultima data revisio {lastDoneRequired && '(obligatori)'}
                  </span>
                  <input
                    type="date"
                    className={`h-10 rounded-xl border px-3 ${
                      lastDoneRequired ? 'border-red-300' : ''
                    }`}
                    value={form.lastDone || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastDone: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Ubicacio</span>
                  <input
                    className="h-10 rounded-xl border px-3"
                    value={form.location || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Operari assignat</span>
                  <input
                    className="h-10 rounded-xl border px-3"
                    value={form.primaryOperator || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, primaryOperator: e.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Segon operari</span>
                  <input
                    className="h-10 rounded-xl border px-3"
                    value={form.backupOperator || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, backupOperator: e.target.value }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto">
              <div className="text-xs text-gray-600 mb-2">Checklist</div>
              <div className="rounded-2xl border px-2 py-2 text-xs text-gray-700">
                {template.sections.map((sec) => {
                  const isOpen = !!openSections[sec.location]
                  return (
                    <div key={sec.location} className="border-b last:border-b-0">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-3 text-left"
                        onClick={() =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [sec.location]: !prev[sec.location],
                          }))
                        }
                      >
                        <div className="text-[11px] font-semibold text-gray-700">
                          {sec.location}
                        </div>
                        <div className="text-[11px] text-gray-500">{sec.items.length}</div>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-4 space-y-2">
                          {sec.items.map((it) => (
                            <div key={`${sec.location}-${it.label}`} className="leading-snug">
                              {it.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            onClick={save}
          >
            Guardar
          </button>
        </div>
      </div>
    </RoleGuard>
  )
}
