'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { addDays, addMonths } from 'date-fns'
import { useParams, useSearchParams } from 'next/navigation'
import { RoleGuard } from '@/lib/withRoleGuard'
type MockDailyItem = {
  id: string
  machine: string
  title: string
  location: string
  company?: string
  worker?: string
  templateId?: string
  date: string
  startTime: string
  endTime: string
  status: 'pendent' | 'en_curs' | 'fet' | 'no_fet'
}

type MockAssignedTicket = {
  id: string
  code: string
  title: string
  location: string
  company?: string
  worker?: string
  templateId?: string
  date: string
  startTime: string
  endTime: string
  status: 'assignat' | 'en_curs' | 'espera' | 'resolut'
}

type TemplateSection = { location: string; items: { label: string }[] }
type Template = {
  id: string
  name: string
  source: string
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  sections: TemplateSection[]
}

type Draft = {
  id: string
  kind: 'preventiu' | 'ticket'
  title: string
  startTime: string
  endTime: string
  status: string
  notes: string
  templateId?: string
  worker?: string
}
type CompletedRecord = {
  id: string
  plannedId?: string | null
  templateId?: string | null
  title: string
  worker?: string | null
  startTime: string
  endTime: string
  status: string
  notes: string
  completedAt: string
  nextDue: string | null
  checklist?: Record<string, boolean>
}

const toDraft = (item: MockDailyItem | MockAssignedTicket): Draft => {
  if ('code' in item) {
    return {
      id: item.id,
      kind: 'ticket',
      title: `${item.code} - ${item.title}`,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
      notes: '',
      templateId: item.templateId,
      worker: item.worker,
    }
  }
  return {
    id: item.id,
    kind: 'preventiu',
    title: item.title,
    startTime: item.startTime,
    endTime: item.endTime,
    status: item.status,
    notes: '',
    templateId: item.templateId,
    worker: item.worker,
  }
}

export default function PreventiusFullsFitxaPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const searchParams = useSearchParams()
  const recordId = searchParams?.get('recordId') || null

  const [plannedItems, setPlannedItems] = useState<(MockDailyItem | MockAssignedTicket)[]>([])
  const [plannedLoaded, setPlannedLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('maintenance.planificador.items')
      const list = raw ? JSON.parse(raw) : []
      if (!Array.isArray(list)) return
      const mapped = list
        .map((item: any) => {
          if (!item?.start || !item?.end) return null
          const title = String(item.title || '')
          const codeMatch = title.match(/^([A-Z]+\d+)/)
          const baseTitle = codeMatch ? title.replace(codeMatch[0], '').trim().replace(/^[-·]/, '').trim() : title
          const templateId = title.toLowerCase().includes('fuites de gas')
            ? 'template-fuites-gas'
            : undefined
          if (item.kind === 'ticket') {
            return {
              id: String(item.id || `plan_${Math.random().toString(36).slice(2, 6)}`),
              code: codeMatch ? codeMatch[1] : 'TIC',
              title: baseTitle || title,
              location: item.location || '',
              worker: Array.isArray(item.workers) ? item.workers.join(', ') : '',
              templateId,
              date: item.date || '',
              startTime: item.start,
              endTime: item.end,
              status: 'assignat',
            } as MockAssignedTicket
          }
          return {
            id: String(item.id || `plan_${Math.random().toString(36).slice(2, 6)}`),
            machine: '',
            title,
            location: item.location || '',
            worker: Array.isArray(item.workers) ? item.workers.join(', ') : '',
            templateId,
            date: item.date || '',
            startTime: item.start,
            endTime: item.end,
            status: 'pendent',
          } as MockDailyItem
        })
        .filter(Boolean) as Array<MockDailyItem | MockAssignedTicket>
      setPlannedItems(mapped)
    } catch {
      setPlannedItems([])
    } finally {
      setPlannedLoaded(true)
    }
  }, [])

  const currentItem = useMemo(() => {
    return plannedItems.find((i) => i.id === id)
  }, [plannedItems, id])

  const [templates, setTemplates] = useState<Template[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [lastRecord, setLastRecord] = useState<CompletedRecord | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    const cacheKey = 'maintenance.templates.cache'
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.templates)) {
          setTemplates(parsed.templates)
        }
      }
    } catch {
      // ignore cache errors
    }
    const load = async () => {
      const res = await fetch('/api/maintenance/templates', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json?.templates) ? json.templates : []
      setTemplates(list)
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ templates: list, at: Date.now() }))
      } catch {
        return
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!currentItem) return
    setDraft(toDraft(currentItem))
  }, [currentItem])

  useEffect(() => {
    if (!recordId) return
    const loadRecord = async () => {
      try {
        const res = await fetch(
          `/api/maintenance/preventius/completed/${encodeURIComponent(recordId)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const json = await res.json()
        const record = json?.record || null
        if (!record) return
        setLastRecord(record)
        if (record.checklist) setChecklistState(record.checklist)
        setDraft({
          id: record.plannedId || id,
          kind: 'preventiu',
          title: record.title || 'Preventiu',
          startTime: record.startTime || '',
          endTime: record.endTime || '',
          status: record.status || 'pendent',
          notes: record.notes || '',
          templateId: record.templateId || undefined,
          worker: record.worker || undefined,
        })
      } catch {
        return
      }
    }
    loadRecord()
  }, [recordId, id])

  useEffect(() => {
    if (!draft || recordId) return
    const load = async () => {
      try {
        const res = await fetch(
          `/api/maintenance/preventius/completed?plannedId=${encodeURIComponent(draft.id)}`,
          { cache: 'no-store' }
        )
        if (!res.ok) return
        const json = await res.json()
        const list = Array.isArray(json?.records) ? json.records : []
        const latest = list[0] || null
        setLastRecord(latest)
        if (latest && latest.checklist) {
          setChecklistState(latest.checklist)
        }
        if (latest && latest.notes !== undefined) {
          setDraft((prev) => (prev ? { ...prev, notes: latest.notes, status: latest.status } : prev))
        }
      } catch {
        return
      }
    }
    load()
  }, [draft?.id, recordId])

  const selectedTemplate = useMemo(() => {
    if (!draft?.templateId) return null
    return templates.find((t) => t.id === draft.templateId) || null
  }, [draft, templates])

  useEffect(() => {
    if (!draft?.templateId || !selectedTemplate) return
    if (Object.keys(checklistState).length > 0) return
    const nextState: Record<string, boolean> = {}
    const nextOpen: Record<string, boolean> = {}
    selectedTemplate.sections.forEach((sec) => {
      sec.items.forEach((it) => {
        const key = `${sec.location}::${it.label}`
        nextState[key] = false
      })
      nextOpen[sec.location] = false
    })
    setChecklistState(nextState)
    setOpenSections(nextOpen)
  }, [draft, selectedTemplate, checklistState])

  const computeNextDue = (date: Date, periodicity?: Template['periodicity']) => {
    if (!periodicity) return null
    if (periodicity === 'monthly') return addMonths(date, 1)
    if (periodicity === 'quarterly') return addMonths(date, 3)
    if (periodicity === 'yearly') return addMonths(date, 12)
    if (periodicity === 'weekly') return addDays(date, 7)
    if (periodicity === 'daily') return addDays(date, 1)
    return null
  }

  const saveCompletion = () => {
    if (!draft) return
    if (lastRecord?.status === 'resolut') {
      alert('Aquest preventiu ja està resolt i no es pot editar.')
      return
    }
    setSaveStatus('saving')
    const now = new Date()
    const nextDue = computeNextDue(now, selectedTemplate?.periodicity)
    const record = {
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      plannedId: draft.id || null,
      templateId: draft.templateId || null,
      title: draft.title,
      worker: draft.worker || null,
      startTime: draft.startTime,
      endTime: draft.endTime,
      status: draft.status,
      notes: draft.notes,
      completedAt: now.toISOString(),
      nextDue: nextDue ? nextDue.toISOString() : null,
      checklist: checklistState,
    }
    fetch('/api/maintenance/preventius/completed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error()
        const json = await res.json().catch(() => null)
        const docId = json?.id ? String(json.id) : record.id
        setSavedAt(now.toISOString())
        setLastRecord({ ...record, id: docId })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
      .catch(() => {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      })
  }

  if (!draft && !plannedLoaded) {
    return (
      <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
        <div className="p-6 text-sm text-gray-600">Carregant fitxa...</div>
      </RoleGuard>
    )
  }

  if (!draft) {
    return (
      <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
        <div className="p-6 text-sm text-gray-600">Fitxa no trobada.</div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap', 'treballador']}>
      <div className="min-h-screen w-full bg-white flex flex-col">
        <div className="border-b px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-base font-semibold text-gray-900">{draft.title}</div>
          <div className="flex items-center gap-2">
            {savedAt && <div className="text-xs text-emerald-700">Guardat</div>}
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-xs text-gray-600"
              onClick={() => window.close()}
            >
              Tancar pestanya
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-0">
            <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto border-b xl:border-b-0 xl:border-r">
              <div className="grid grid-cols-1 gap-4 text-sm pb-24 xl:pb-6">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Hora inici</span>
                  <input
                    type="time"
                    className="h-10 rounded-xl border px-3"
                    value={draft.startTime}
                    disabled={lastRecord?.status === 'resolut'}
                    onChange={(e) => setDraft((d) => (d ? { ...d, startTime: e.target.value } : d))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Hora fi</span>
                  <input
                    type="time"
                    className="h-10 rounded-xl border px-3"
                    value={draft.endTime}
                    disabled={lastRecord?.status === 'resolut'}
                    onChange={(e) => setDraft((d) => (d ? { ...d, endTime: e.target.value } : d))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Observacions</span>
                  <textarea
                    className="min-h-[120px] rounded-xl border px-3 py-2 text-sm"
                    value={draft.notes}
                    disabled={lastRecord?.status === 'resolut'}
                    onChange={(e) => setDraft((d) => (d ? { ...d, notes: e.target.value } : d))}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600">Estat</span>
                  <select
                    className="h-10 rounded-xl border px-3"
                    value={draft.status}
                    disabled={lastRecord?.status === 'resolut'}
                    onChange={(e) => setDraft((d) => (d ? { ...d, status: e.target.value } : d))}
                  >
                    <option value="pendent">Pendent</option>
                    <option value="en_curs">En curs</option>
                    <option value="fet">Fet</option>
                    <option value="no_fet">No fet</option>
                    <option value="assignat">Assignat</option>
                    <option value="espera">Espera</option>
                    <option value="resolut">Resolut</option>
                  </select>
                </label>
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-gray-600">Adjuntar imatge</div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1 rounded-full border text-xs cursor-pointer">
                      Fitxer
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          setImagePreview(file ? URL.createObjectURL(file) : null)
                        }}
                      />
                    </label>
                    <label className="px-3 py-1 rounded-full border text-xs cursor-pointer">
                      Foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          setImagePreview(file ? URL.createObjectURL(file) : null)
                        }}
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Previsualització"
                      className="w-full max-h-48 object-cover rounded-xl border"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto">
              <div className="text-xs text-gray-600 mb-2">Checklist</div>
              {selectedTemplate ? (
                <div className="rounded-2xl border px-2 py-2 text-xs text-gray-700">
                  {selectedTemplate.sections.map((sec) => {
                    const isOpen = !!openSections[sec.location]
                    const doneCount = sec.items.filter((it) => {
                      const key = `${sec.location}::${it.label}`
                      return checklistState[key]
                    }).length
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
                          <div className="text-[11px] text-gray-500">
                            {doneCount}/{sec.items.length}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-4 space-y-2">
                            {sec.items.map((it) => {
                              const key = `${sec.location}::${it.label}`
                              return (
                                <label key={key} className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!checklistState[key]}
                                    disabled={lastRecord?.status === 'resolut'}
                                    onChange={() =>
                                      setChecklistState((prev) => ({
                                        ...prev,
                                        [key]: !prev[key],
                                      }))
                                    }
                                  />
                                  <span className="leading-snug">{it.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-xl border px-3 py-2 text-xs text-gray-500">
                  (Aquí es generarà el checklist del preventiu / ticket)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          {saveStatus === 'saved' && (
            <div className="mr-auto text-xs text-emerald-700">Guardat correctament.</div>
          )}
          {saveStatus === 'error' && (
            <div className="mr-auto text-xs text-red-600">No s’ha pogut guardar.</div>
          )}
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
            onClick={saveCompletion}
          >
            {saveStatus === 'saving' ? 'Guardant...' : 'Guardar'}
          </button>
        </div>
      </div>
    </RoleGuard>
  )
}
