import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import type { FiltersState } from '@/components/layout/FiltersBar'
import type { QuadrantEvent } from '@/types/QuadrantEvent'
import type { QuadrantStatus, UnifiedEvent } from '@/app/menu/quadrants/types'

interface UseQuadrantsPageDataParams {
  events: QuadrantEvent[]
  quadrants: any[]
  filters: FiltersState
}

export interface QuadrantsPageCounts {
  pending: number
  draft: number
  confirmed: number
}

export interface UseQuadrantsPageDataResult {
  eventsWithStatus: UnifiedEvent[]
  counts: QuadrantsPageCounts
  filteredEvents: UnifiedEvent[]
  grouped: [string, UnifiedEvent[]][]
  phasesByEventId: Record<string, Set<string>>
}

const normalize = (value?: string) =>
  (value || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

const cleanText = (value?: unknown) => {
  const s = (value || '').toString().trim()
  if (!s) return ''
  const bad = new Set([
    '--',
    '-',
    'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â',
    'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ',
    'ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ',
    'ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â',
  ])
  return bad.has(s) ? '' : s
}

const getEventKey = (item: any) =>
  String(item?.id || item?.eventId || item?.eventCode || item?.code || '').trim()

const buildWorkersSummary = (q: any) => {
  const names: string[] = []
  if (q?.responsableName) names.push(q.responsableName)
  if (Array.isArray(q?.conductors)) {
    names.push(...q.conductors.map((c: any) => c?.name).filter(Boolean))
  }
  if (Array.isArray(q?.treballadors)) {
    names.push(
      ...q.treballadors
        .map((t: any) => t?.name)
        .filter((n: any) => Boolean(n) && String(n) !== 'Extra')
    )
  }
  if (Array.isArray(q?.brigades)) {
    q.brigades.forEach((b: any) => {
      const name = (b?.name || 'ETT').toString().trim() || 'ETT'
      const workers = Number(b?.workers || 0)
      names.push(workers > 0 ? `${name} (${workers})` : name)
    })
  }
  return names.join(', ')
}

export function useQuadrantsPageData({
  events,
  quadrants,
  filters,
}: UseQuadrantsPageDataParams): UseQuadrantsPageDataResult {
  const eventsWithStatus = useMemo<UnifiedEvent[]>(() => {
    const out: UnifiedEvent[] = []
    const eventsById = new Map<string, any>()
    const eventsByCode = new Map<string, any>()
    const quadrantsByEvent = new Map<string, any[]>()

    ;(events as any[]).forEach((ev) => {
      const id = String(ev.id || ev.eventId || ev.code || '').trim()
      if (id) eventsById.set(id, ev)
      const code = normalize(ev.code || ev.eventCode || '')
      if (code) eventsByCode.set(code, ev)
    })

    ;(quadrants as any[]).forEach((q) => {
      const id = String(q.eventId || q.code || q.eventCode || '').trim()
      if (!id) return
      const list = quadrantsByEvent.get(id) || []
      list.push(q)
      quadrantsByEvent.set(id, list)
    })

    ;(quadrants as any[]).forEach((q) => {
      const ev =
        (q.eventId && eventsById.get(String(q.eventId))) ||
        eventsById.get(getEventKey(q)) ||
        eventsByCode.get(normalize(q.code || q.eventCode || '')) ||
        null

      const eventDateBase =
        (ev?.start ? String(ev.start).slice(0, 10) : '') ||
        (q?.eventDate ? String(q.eventDate).slice(0, 10) : '') ||
        (q?.eventStartDate ? String(q.eventStartDate).slice(0, 10) : '') ||
        ''
      const eventStartDate = eventDateBase || q.startDate
      const eventStartTime =
        ev?.horaInici || (ev?.start ? String(ev.start).slice(11, 16) : null)
      const eventEndTime = ev?.end ? String(ev.end).slice(11, 16) : null
      const displayDate = q.phaseDate || q.startDate || eventStartDate

      const s = String(q?.status || '').toLowerCase()
      let quadrantStatus: QuadrantStatus = 'pending'
      if (s === 'draft') quadrantStatus = 'draft'
      else if (s === 'confirmed') quadrantStatus = 'confirmed'

      const displayStartTime = q.startTime || eventStartTime || undefined
      const displayEndTime = q.endTime || eventEndTime || undefined
      const horariLabel = `${displayStartTime || '--:--'} - ${
        displayEndTime || '--:--'
      }`

      const phaseType = (q.phaseType || q.phaseLabel || '')
        .toString()
        .trim()
        .toLowerCase()
      const phaseLabelRaw = (q.phaseLabel || q.phaseType || '').toString().trim()
      const phaseKeyValue = normalize(phaseType || phaseLabelRaw)
      const eventDateLabel = eventDateBase || eventStartDate
        ? format(parseISO(eventDateBase || eventStartDate), 'dd/MM')
        : ''
      let phaseBadgeLabel = ''
      if (phaseLabelRaw) {
        if (phaseType === 'event') {
          phaseBadgeLabel = phaseLabelRaw.toUpperCase()
        } else if (eventDateLabel) {
          phaseBadgeLabel = `${phaseLabelRaw.toUpperCase()} (${eventDateLabel})`
        } else {
          phaseBadgeLabel = phaseLabelRaw.toUpperCase()
        }
      }
      const phaseDate = displayDate ? String(displayDate).slice(0, 10) : undefined

      out.push({
        ...(ev || q),
        id: q.id || q.eventId || q.code || '',
        eventId: String(q.eventId || ev?.id || ev?.eventId || q.code || ''),
        summary: ev?.summary || ev?.name || q.eventName || '-',
        start: `${displayDate}T${q.startTime || '00:00'}:00`,
        end: `${(q.endDate || displayDate)}T${q.endTime || '00:00'}:00`,
        code: q.code || q.eventCode || '',
        location: cleanText(q.location || ev?.location || ''),
        ln: cleanText(ev?.ln || ev?.lnLabel || q.ln || '') || null,
        responsable: cleanText(q.responsableName || ev?.responsable || ''),
        numPax: ev?.numPax ?? q?.numPax ?? null,
        service: cleanText(q.service || ev?.service || '') || null,
        commercial: ev?.commercial || null,
        workersSummary: buildWorkersSummary(q),
        displayStartTime,
        displayEndTime,
        quadrantStatus,
        horariLabel,
        phaseBadgeLabel,
        phaseType: phaseType || undefined,
        phaseLabel: phaseLabelRaw || undefined,
        phaseKey: phaseKeyValue || undefined,
        phaseDate,
        eventDateLabel,
        eventDateRaw: (eventDateBase || eventStartDate) || undefined,
        draft: q,
      })
    })

    ;(events as any[]).forEach((ev) => {
      const eventId = String(ev.id || ev.eventId || ev.code || '').trim()
      if (!eventId) return
      const existing = quadrantsByEvent.get(eventId) || []
      const hasEventDoc = existing.some((q) => {
        const p = (q.phaseType || q.phaseLabel || '')
          .toString()
          .trim()
          .toLowerCase()
        return p === 'event'
      })
      if (hasEventDoc) return

      const eventStartDate = ev?.start ? String(ev.start).slice(0, 10) : ''
      const eventStartTime =
        ev?.horaInici || (ev?.start ? String(ev.start).slice(11, 16) : null)
      const eventEndTime = ev?.end ? String(ev.end).slice(11, 16) : null
      const eventDateLabel = eventStartDate
        ? format(parseISO(eventStartDate), 'dd/MM')
        : ''

      out.push({
        ...(ev as QuadrantEvent),
        id: String(ev.id || ev.eventId || ev.code || ''),
        eventId: String(ev.id || ev.eventId || ev.code || ''),
        summary: ev.summary || ev.name || '-',
        start: ev.start || '',
        end: ev.end || '',
        code: ev.code || '',
        location: cleanText(ev.location || ''),
        ln: cleanText(ev.ln || ev.lnLabel || '') || null,
        responsable: cleanText(ev.responsable || ''),
        numPax: ev.numPax ?? null,
        service: cleanText(ev.service || '') || null,
        commercial: ev.commercial || null,
        workersSummary: '',
        displayStartTime: eventStartTime || undefined,
        displayEndTime: eventEndTime || undefined,
        quadrantStatus: 'pending',
        horariLabel: `${eventStartTime || '--:--'} - ${eventEndTime || '--:--'}`,
        phaseBadgeLabel: '',
        phaseType: undefined,
        phaseLabel: undefined,
        phaseKey: 'event',
        phaseDate: eventStartDate || undefined,
        eventDateLabel,
        eventDateRaw: eventStartDate || undefined,
        draft: null,
      })
    })

    return out
  }, [events, quadrants])

  const phasesByEventId = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const ev of eventsWithStatus) {
      if (!ev.draft) continue
      const eventId = String(ev.eventId || ev.eventCode || ev.code || ev.id || '')
        .trim()
      if (!eventId) continue
      const phase = (ev.phaseKey || ev.phaseType || ev.phaseLabel || '')
        .toString()
        .toLowerCase()
        .trim()
      if (!phase) continue
      if (!map[eventId]) map[eventId] = new Set<string>()
      map[eventId].add(phase)
    }
    return map
  }, [eventsWithStatus])

  const counts = useMemo<QuadrantsPageCounts>(() => {
    let pending = 0
    let draft = 0
    let confirmed = 0

    for (const ev of eventsWithStatus) {
      if (ev.quadrantStatus === 'draft') draft++
      else if (ev.quadrantStatus === 'confirmed') confirmed++
      else pending++
    }

    return { pending, draft, confirmed }
  }, [eventsWithStatus])

  const filteredEvents = useMemo<UnifiedEvent[]>(() => {
    return eventsWithStatus.filter((ev) => {
      const evLn = (ev.ln || '').toString().trim().toLowerCase()
      const evResp = (ev.responsable || '').toString().trim().toLowerCase()
      const evLoc = (ev.location || '').toString().trim().toLowerCase()

      const fLn = (filters.ln || '').toLowerCase()
      const fResp = (filters.responsable || '').toLowerCase()
      const fLoc = (filters.location || '').toLowerCase()

      if (filters.status !== '__all__' && ev.quadrantStatus !== filters.status)
        return false

      if (filters.ln !== '__all__' && fLn !== evLn) return false

      if (filters.responsable !== '__all__' && !evResp.includes(fResp))
        return false

      if (filters.location !== '__all__' && fLoc !== evLoc) return false

      return true
    })
  }, [eventsWithStatus, filters])

  const grouped = useMemo<[string, UnifiedEvent[]][]>(() => {
    const map: Record<string, UnifiedEvent[]> = {}
    for (const ev of filteredEvents) {
      const day = ev.start.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(ev)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEvents])

  return {
    eventsWithStatus,
    counts,
    filteredEvents,
    grouped,
    phasesByEventId,
  }
}
