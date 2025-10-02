// src/lib/gcal/normalize.ts
import { extractCode } from '@/utils/extractCode'

export type GCalEvent = {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  [k: string]: unknown
}

const stripCodeFromTitle = (summary = '') =>
  summary.replace(/\s*-\s*#\w+\s*$/i, '').trim()

const parseCommercial = (description = '') => {
  const text = description.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  // comercial: xxx | com: xxx | Comercial - xxx
  const m =
    text.match(/(?:comercial|com)\s*[:\-]\s*([^\n\r]+)/i) ??
    text.match(/comercial\s+([^\n\r]+)/i)
  return (m?.[1] || '').trim()
}

const shortLocation = (s = '') => {
  const first = (s.split(',')[0] ?? s).trim()
  return first.length > 30 ? first.slice(0, 30) + '…' : first
}

const lnFromCode = (code = ''): { lnKey: string; lnLabel: string } => {
  const up = code.toUpperCase()
  if (up.startsWith('PM')) return { lnKey: 'PM', lnLabel: 'Prova de menú' }
  const key = up.charAt(0)
  switch (key) {
    case 'E': return { lnKey: 'E', lnLabel: 'Empresa' }
    case 'C': return { lnKey: 'C', lnLabel: 'Casaments' }
    case 'F': return { lnKey: 'F', lnLabel: 'Foodlovers' }
    case 'A': return { lnKey: 'A', lnLabel: 'Agenda' }
    default:  return { lnKey: '-', lnLabel: '—' }
  }
}

export type NormalizedEvent = {
  id?: string
  title: string           // summary sense la cua #Codi
  code: string            // E2500440, PMxxxxx, etc.
  lnKey: string           // E | C | PM | F | A | -
  lnLabel: string         // Empresa | Casaments | …
  location: string        // completa (Google Calendar)
  locationShort: string   // curta (tooltip)
  commercial: string      // “comercial: …” del description
}

export function normalizeGCalEvent(ev: GCalEvent): NormalizedEvent {
  const title = stripCodeFromTitle(ev.summary || '')
  const code = extractCode(ev.summary || '') || ''
  const { lnKey, lnLabel } = lnFromCode(code)
  const location = (ev.location || '').trim()
  const locationShort = shortLocation(location)
  const commercial = parseCommercial(ev.description || '')

  return {
    id: ev.id,
    title,
    code,
    lnKey,
    lnLabel,
    location,
    locationShort,
    commercial,
  }
}
