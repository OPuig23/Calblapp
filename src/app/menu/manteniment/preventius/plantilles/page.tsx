'use client'

import React, { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { RoleGuard } from '@/lib/withRoleGuard'
import FloatingAddButton from '@/components/ui/floating-add-button'

type TemplateSection = { location: string; items: { label: string }[] }
type Template = {
  id: string
  name: string
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null
  lastDone?: string | null
  location?: string
  primaryOperator?: string
  backupOperator?: string
  sections: TemplateSection[]
}

type ImportModel = 'A' | 'B' | 'C' | 'D' | 'UNKNOWN'

type ImportCandidate = {
  name: string
  periodicity?: Template['periodicity']
  location?: string
  sections: TemplateSection[]
}

type ImportPreview = {
  fileName: string
  model: ImportModel
  templates: ImportCandidate[]
  warnings: string[]
}

const PERIODICITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Totes' },
  { value: 'daily', label: 'Diari' },
  { value: 'weekly', label: 'Setmanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
]

const SHEET_PERIODICITY: Record<string, NonNullable<Template['periodicity']>> = {
  DIARIS: 'daily',
  SETMANALS: 'weekly',
  MENSUALS: 'monthly',
  TRIMESTRALS: 'quarterly',
  SEMESTRALS: 'quarterly',
  ANUALS: 'yearly',
}

const normalize = (value?: string) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim()

const cleanText = (value: unknown) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const compactRows = (rows: unknown[][]) =>
  rows.map((r) => (Array.isArray(r) ? r.map(cleanText) : [])).filter((r) => r.some(Boolean))

const isPeriodLabel = (v: string) => {
  const n = normalize(v)
  return ['DIARI', 'SETMANAL', 'MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].some((k) =>
    n.startsWith(k)
  )
}

const periodFromLabel = (v: string): Template['periodicity'] => {
  const n = normalize(v)
  if (n.startsWith('DIARI')) return 'daily'
  if (n.startsWith('SETMANAL')) return 'weekly'
  if (n.startsWith('MENSUAL')) return 'monthly'
  if (n.startsWith('TRIMESTRAL') || n.startsWith('SEMESTRAL')) return 'quarterly'
  if (n.startsWith('ANUAL')) return 'yearly'
  return null
}

const detectModel = (sheetNames: string[], rows: string[][]): ImportModel => {
  const hasPeriodicSheets = sheetNames.some((s) => !!SHEET_PERIODICITY[normalize(s)])
  if (hasPeriodicSheets) return 'C'

  const hasMatrixMarkers = rows.some((r) => {
    const n0 = normalize(r[0] || '')
    const n1 = normalize(r[1] || '')
    return (
      n0.includes('PERIODE') &&
      (n1 === '↓' || n1.includes('A COMPROVAR') || n1.includes('ELEMENTS'))
    )
  })
  if (hasMatrixMarkers) return 'D'

  const joined = rows.map((r) => normalize(r.join(' | '))).join('\n')
  if (joined.includes('UBICACIO') && (joined.includes('FEINES A FER') || joined.includes('TREBALLS A FER'))) {
    return 'A'
  }
  if (joined.includes('PERIODE') && joined.includes('TREBALLS')) return 'B'
  if (joined.includes('FEINES') && (joined.includes('FET') || joined.includes('PENDENT'))) return 'B'
  return 'UNKNOWN'
}

const rowsToSectionsByLocation = (rows: string[][]) => {
  let headerIdx = -1
  let locationCol = 0
  let taskCol = 1

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx += 1) {
    const r = rows[rowIdx]
    let locCandidate = -1
    let taskCandidate = -1
    for (let c = 0; c < r.length; c += 1) {
      const n = normalize(r[c] || '')
      if (locCandidate < 0 && (n.includes('UBICACIO') || n.includes('APARELLS'))) locCandidate = c
      if (taskCandidate < 0 && (n.includes('FEINES') || n.includes('TREBALLS'))) taskCandidate = c
    }
    if (locCandidate >= 0 && taskCandidate >= 0) {
      headerIdx = rowIdx
      locationCol = locCandidate
      taskCol = taskCandidate
      break
    }
  }

  const sectionsMap = new Map<string, Set<string>>()
  let current = 'GENERAL'

  const addTask = (location: string, task: string) => {
    if (!sectionsMap.has(location)) sectionsMap.set(location, new Set())
    sectionsMap.get(location)!.add(task)
  }

  rows.slice(Math.max(0, headerIdx + 1)).forEach((r) => {
    const c0 = cleanText(r[locationCol])
    const c1 = cleanText(r[taskCol])
    const n0 = normalize(c0)
    const n1 = normalize(c1)

    const isHeaderLike =
      n0.includes('UBICACIO') ||
      n0.includes('APARELLS') ||
      n0.includes('OBSERVACIONS') ||
      n1.includes('REVISAT') ||
      n1.includes('SUBSTITUIT') ||
      n1.includes('FET')
    if (isHeaderLike) return

    if (!c0 && !c1) return

    // Most real sheets use: [location | task] then [empty | task]...
    if (c0 && c1 && !isPeriodLabel(c0)) {
      current = c0
      addTask(current, c1)
      return
    }

    if (c0 && !isPeriodLabel(c0) && !c1) {
      current = c0
      if (!sectionsMap.has(current)) sectionsMap.set(current, new Set())
      return
    }

    const task = c1 || c0
    if (!task) return
    if (isPeriodLabel(task)) return

    addTask(current, task)
  })

  return Array.from(sectionsMap.entries())
    .map(([location, items]) => ({
      location,
      items: Array.from(items).map((label) => ({ label })),
    }))
    .filter((s) => s.items.length > 0)
}

const rowsToSectionsByPeriod = (rows: string[][]) => {
  let current = 'GENERAL'
  const sectionsMap = new Map<string, Set<string>>()

  rows.forEach((r) => {
    const c0 = cleanText(r[0])
    const c1 = cleanText(r[1])
    const c2 = cleanText(r[2])

    if (isPeriodLabel(c0)) {
      current = c0
      if (!sectionsMap.has(current)) sectionsMap.set(current, new Set())
      return
    }

    const n0 = normalize(c0)
    if (n0.includes('FEINES') || n0.includes('TREBALLS') || n0.includes('PERIODE') || n0.includes('OBSERVACIONS')) {
      return
    }

    const task = c1 || c0 || c2
    if (!task || isPeriodLabel(task)) return

    if (!sectionsMap.has(current)) sectionsMap.set(current, new Set())
    sectionsMap.get(current)!.add(task)
  })

  return Array.from(sectionsMap.entries())
    .map(([location, items]) => ({
      location,
      items: Array.from(items).map((label) => ({ label })),
    }))
    .filter((s) => s.items.length > 0)
}

const firstMeaningful = (rows: string[][]) => {
  for (const r of rows) {
    const first = r.find((v) => !!cleanText(v))
    if (first) return cleanText(first)
  }
  return 'Plantilla importada'
}

const rowsToSectionsMatrix = (rows: string[][]) => {
  const headerTopIdx = rows.findIndex((r) => normalize(r[0] || '').includes('ANY'))
  const headerBottomIdx = rows.findIndex((r) => normalize(r[0] || '').includes('PERIODE'))
  const startDataIdx = headerBottomIdx >= 0 ? headerBottomIdx + 1 : Math.max(3, headerTopIdx + 1)

  // Column names from both header rows (zone + subzone)
  const columnNames: string[] = []
  for (let c = 2; c < 20; c += 1) {
    const top = cleanText(rows[headerTopIdx]?.[c] || '')
    const bottom = cleanText(rows[headerBottomIdx]?.[c] || '')
    const name = [top, bottom].filter(Boolean).join(' - ').trim()
    if (!name) continue
    columnNames[c] = name
  }

  const sectionsMap = new Map<string, Set<string>>()
  let currentPeriod = 'GENERAL'

  rows.slice(startDataIdx).forEach((r) => {
    const c0 = cleanText(r[0])
    const c1 = cleanText(r[1])
    const n0 = normalize(c0)
    const n1 = normalize(c1)

    if (n0.includes('OBSERVACIONS')) return
    if (isPeriodLabel(c0) || /^\\d/.test(c0)) {
      currentPeriod = c0 || currentPeriod
    }

    const baseTask = c1
    if (!baseTask || n1 === '↓') return

    let hasExplicitMarks = false
    for (let c = 2; c < r.length; c += 1) {
      const mark = cleanText(r[c])
      if (!mark) continue
      hasExplicitMarks = true
      const zone = columnNames[c] || `Columna ${c + 1}`
      if (!sectionsMap.has(zone)) sectionsMap.set(zone, new Set())
      sectionsMap.get(zone)!.add(`[${currentPeriod}] ${baseTask}`)
    }

    // In many sheets marks are empty but tasks apply to all zones
    if (!hasExplicitMarks) {
      const zones = Object.values(columnNames).filter(Boolean)
      if (zones.length === 0) {
        if (!sectionsMap.has('GENERAL')) sectionsMap.set('GENERAL', new Set())
        sectionsMap.get('GENERAL')!.add(`[${currentPeriod}] ${baseTask}`)
      } else {
        zones.forEach((zone) => {
          if (!sectionsMap.has(zone)) sectionsMap.set(zone, new Set())
          sectionsMap.get(zone)!.add(`[${currentPeriod}] ${baseTask}`)
        })
      }
    }
  })

  return Array.from(sectionsMap.entries())
    .map(([location, items]) => ({
      location,
      items: Array.from(items).map((label) => ({ label })),
    }))
    .filter((s) => s.items.length > 0)
}

const parseWorkbook = (fileName: string, wb: XLSX.WorkBook): ImportPreview => {
  const sheetNames = wb.SheetNames || []
  const primarySheet = sheetNames[0]
  const rows = primarySheet
    ? compactRows(XLSX.utils.sheet_to_json(wb.Sheets[primarySheet], { header: 1, defval: '' }) as unknown[][])
    : []

  const model = detectModel(sheetNames, rows)
  const warnings: string[] = []
  const templates: ImportCandidate[] = []

  if (model === 'A') {
    const sections = rowsToSectionsByLocation(rows)
    templates.push({
      name: firstMeaningful(rows),
      periodicity: null,
      sections,
    })
  } else if (model === 'B') {
    const sections = rowsToSectionsByPeriod(rows)
    let periodicity: Template['periodicity'] = null
    for (const s of sections) {
      if (s.location !== 'GENERAL') {
        periodicity = periodFromLabel(s.location)
        if (periodicity) break
      }
    }
    templates.push({
      name: firstMeaningful(rows),
      periodicity,
      sections,
    })
  } else if (model === 'C') {
    sheetNames.forEach((sheet) => {
      const p = SHEET_PERIODICITY[normalize(sheet)]
      if (!p) return
      const sheetRows = compactRows(
        XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' }) as unknown[][]
      )
      const sections = rowsToSectionsByLocation(sheetRows)
      const title = firstMeaningful(sheetRows)
      templates.push({
        name: title || `Preventiu ${sheet}`,
        periodicity: p,
        sections,
      })
    })
    if (templates.length === 0) warnings.push('No s\'han detectat pestanyes de temporalitat importables.')
  } else if (model === 'D') {
    sheetNames.forEach((sheet) => {
      const sheetRows = compactRows(
        XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' }) as unknown[][]
      )
      const sections = rowsToSectionsMatrix(sheetRows)
      if (sections.length === 0) return
      const title = firstMeaningful(sheetRows)
      templates.push({
        name: `${title} - ${sheet}`,
        periodicity: null,
        sections,
      })
    })
    if (templates.length === 0) warnings.push('Model D detectat pero sense seccions importables.')
  } else {
    warnings.push('Format no reconegut automaticament (model D/altre).')
  }

  const cleaned = templates
    .map((t) => ({
      ...t,
      sections: t.sections.filter((s) => s.items.length > 0),
    }))
    .filter((t) => t.sections.length > 0)

  if (cleaned.length === 0) warnings.push('No s\'han extret tasques valides del fitxer.')

  return {
    fileName,
    model,
    templates: cleaned,
    warnings,
  }
}

export default function PreventiusPlantillesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [periodicity, setPeriodicity] = useState('all')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)

  const loadTemplates = async () => {
    const res = await fetch('/api/maintenance/templates', { cache: 'no-store' })
    if (!res.ok) {
      setTemplates([])
      return
    }
    const json = await res.json()
    setTemplates(Array.isArray(json?.templates) ? json.templates : [])
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (periodicity !== 'all' && t.periodicity !== periodicity) return false
      if (!term) return true
      const hay = [t.name, t.location, t.primaryOperator, t.backupOperator]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [templates, search, periodicity])

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

  const handleFile = async (file?: File | null) => {
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const parsed = parseWorkbook(file.name, wb)
      setPreview(parsed)
    } catch {
      setPreview({
        fileName: file.name,
        model: 'UNKNOWN',
        templates: [],
        warnings: ['No s\'ha pogut llegir el fitxer.'],
      })
    }
  }

  const importTemplates = async () => {
    if (!preview || preview.templates.length === 0) return
    setImporting(true)
    try {
      let ok = 0
      for (const candidate of preview.templates) {
        const res = await fetch('/api/maintenance/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: candidate.name,
            periodicity: candidate.periodicity || null,
            sections: candidate.sections,
          }),
        })
        if (res.ok) ok += 1
      }
      await loadTemplates()
      alert(`Importacio finalitzada: ${ok}/${preview.templates.length} plantilles creades.`)
      setPreview(null)
    } catch {
      alert('No s\'ha pogut completar la importacio.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
        <ModuleHeader subtitle="Plantilles (plans) i checklists" />

        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-900">Importar plantilla</div>
          <div className="text-xs text-gray-600">
            Carrega un fitxer Excel de preventiu. Detectem el model (A/B/C), el convertim a format estandard i et mostrem previsualitzacio abans de guardar.
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="block w-full text-sm"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {preview && (
            <div className="rounded-xl border p-3 space-y-2">
              <div className="text-xs text-gray-700">
                Fitxer: <span className="font-semibold">{preview.fileName}</span> · Model detectat: <span className="font-semibold">{preview.model}</span>
              </div>
              <div className="text-xs text-gray-700">Plantilles detectades: {preview.templates.length}</div>
              {preview.warnings.map((w, idx) => (
                <div key={idx} className="text-xs text-amber-700">{w}</div>
              ))}
              {preview.templates.slice(0, 4).map((t, idx) => (
                <div key={`${t.name}-${idx}`} className="text-xs text-gray-700">
                  {t.name} · {t.periodicity || 'sense temporalitat'} · {t.sections.length} seccions
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-full border px-3 py-1 text-xs"
                  onClick={() => setPreview(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={importing || preview.templates.length === 0}
                  onClick={importTemplates}
                >
                  {importing ? 'Important...' : 'Importar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-gray-900">Plantilles</div>
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-gray-900 hover:underline"
                      onClick={() => openTemplate(t.id)}
                    >
                      {t.name}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-600">
                      <span>Temporalitat: {t.periodicity || '—'}</span>
                      <span>Ultima revisio: {t.lastDone || '—'}</span>
                      <span>Ubicacio: {t.location || '—'}</span>
                      <span>Seccions: {t.sections.length}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      const ok = window.confirm(`Vols eliminar la plantilla \"${t.name}\"?`)
                      if (!ok) return
                      try {
                        const res = await fetch(`/api/maintenance/templates/${encodeURIComponent(t.id)}`, {
                          method: 'DELETE',
                        })
                        if (!res.ok) throw new Error('delete_failed')
                        await loadTemplates()
                      } catch {
                        alert("No s'ha pogut eliminar la plantilla.")
                      }
                    }}
                  >
                    Eliminar
                  </button>
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
