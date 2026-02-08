'use client'

import React, { useEffect, useMemo, useState } from 'react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import FloatingAddButton from '@/components/ui/floating-add-button'

type Template = {
  id: string
  name: string
  source: string
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  lastDone?: string | null
  location?: string
  primaryOperator?: string
  backupOperator?: string
  sections: { location: string; items: { label: string }[] }[]
}

type TemplateMeta = {
  periodicity?: Template['periodicity']
  lastDone?: string | null
  location?: string
  primaryOperator?: string
  backupOperator?: string
}

const PERIODICITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Totes' },
  { value: 'daily', label: 'Diari' },
  { value: 'weekly', label: 'Setmanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]

export default function PreventiusPlantillesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [metaById, setMetaById] = useState<Record<string, TemplateMeta>>({})
  const [search, setSearch] = useState('')
  const [periodicity, setPeriodicity] = useState('all')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/maintenance/templates', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setTemplates(Array.isArray(json?.templates) ? json.templates : [])
    }
    load()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('maintenance.templates.meta')
      const parsed = raw ? JSON.parse(raw) : {}
      setMetaById(parsed && typeof parsed === 'object' ? parsed : {})
    } catch {
      setMetaById({})
    }
  }, [])

  const merged = useMemo(() => {
    return templates.map((t) => ({ ...t, ...(metaById[t.id] || {}) }))
  }, [templates, metaById])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return merged.filter((t) => {
      if (periodicity !== 'all' && t.periodicity !== periodicity) return false
      if (!term) return true
      const hay = [
        t.name,
        t.location,
        t.primaryOperator,
        t.backupOperator,
        t.source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [merged, search, periodicity])

  const openTemplate = (id: string) => {
    const url = `/menu/manteniment/preventius/plantilles/${id}`
    const win = window.open(url, '_blank', 'noopener')
    if (win) win.opener = null
  }

  const openNew = () => {
    const url = `/menu/manteniment/preventius/plantilles/new`
    const win = window.open(url, '_blank', 'noopener')
    if (win) win.opener = null
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Plantilles (plans) i checklists" />

        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Plantilles</div>
              <div className="text-xs text-gray-600">
                Exemple carregat des d'Excel: FUITES - Preventiu.xlsx
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="h-10 w-full sm:w-[260px] rounded-xl border bg-white px-3 text-sm"
                placeholder="Cerca per nom, ubicacio o operari"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="h-10 rounded-xl border bg-white px-3 text-sm"
                value={periodicity}
                onChange={(e) => setPeriodicity(e.target.value)}
              >
                {PERIODICITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-900">Llistat</div>
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">No hi ha plantilles.</div>
            )}
            {filtered.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-gray-900 hover:underline"
                      onClick={() => openTemplate(t.id)}
                    >
                      {t.name}
                    </button>
                    <div className="text-xs text-gray-600">Origen: {t.source}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-600">
                      <span>Temporalitat: {t.periodicity || '—'}</span>
                      <span>Ultima revisio: {t.lastDone || '—'}</span>
                      <span>Ubicacio: {t.location || '—'}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-gray-600">
                      <span>Operari: {t.primaryOperator || '—'}</span>
                      <span>Segon: {t.backupOperator || '—'}</span>
                      <span>Seccions: {t.sections.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FloatingAddButton onClick={openNew} />
    </RoleGuard>
  )
}
