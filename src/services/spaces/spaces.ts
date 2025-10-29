// ✅ file: src/services/spaces/spaces.ts
import { firestore } from '@/lib/firebaseAdmin'
import { AlertTriangle } from 'lucide-react'

import {
  startOfWeek,
  endOfWeek,
  parseISO,
  format,
  isValid,
  addDays,
  differenceInHours,
} from 'date-fns'

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function normalizeText(t: any): string {
  return (t || '').toString().trim()
}

function isWedding(ln?: string): boolean {
  const s = ln?.toLowerCase() || ''
  return s.includes('casament') || s.includes('casaments')
}

function isCorporateOrGroups(ln?: string): boolean {
  const s = ln?.toLowerCase() || ''
  return s.includes('empresa') || s.includes('grups')
}

function isRestaurant(ln?: string): boolean {
  const s = ln?.toLowerCase() || ''
  return s.includes('restaurant')
}

function parseHourToMinutes(h?: string): number | null {
  if (!h) return null
  const [hh, mm] = h.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null
  return hh * 60 + mm
}

function diffHours(a: number, b: number) {
  return Math.abs(a - b) / 60
}

// ──────────────────────────────────────────────────────────────
// Tipus base
// ──────────────────────────────────────────────────────────────
interface RawEvent {
  id: string
  finca: string
  date: string // DataInici (yyyy-MM-dd)
  dateEnd?: string // DataFinal si existeix
  ln?: string
  stage: 'verd' | 'taronja' | 'blau' | 'lila'
  eventName: string
  commercial: string
  numPax: number
  startTime?: string
  code?: string
  service?: string
}

interface EventOut extends RawEvent {
  discarded?: boolean
  reason?: string
  warning?: boolean   // 👈 afegim aquest camp
}


interface DayOut {
  date: string
  events: EventOut[]
}

interface SpaceRow {
  finca: string
  dies: DayOut[]
}

export interface SpacesResult {
  data: SpaceRow[]
  totalPaxPerDia: number[]
}

// ──────────────────────────────────────────────────────────────
// Log de conflictes per avisar comercials
// ──────────────────────────────────────────────────────────────
async function logConflict(ev: RawEvent, reason: string) {
  try {
    await firestore.collection('spaces_conflicts').add({
      ...ev,
      reason,
      createdAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('⚠️ Error guardant conflict:', e)
  }
}

// ──────────────────────────────────────────────────────────────
// Consulta principal
// ──────────────────────────────────────────────────────────────
export async function getSpacesByWeek(
  month: number,
  year: number,
  fincaFilter: string = '',
  comercialFilter: string = '',
  baseDate?: string,
  stage: string = 'all'
): Promise<SpacesResult> {
  try {
    // 1️⃣ Calcula rang de setmana
    const base = baseDate ? new Date(baseDate) : new Date(year, month)
    const startRange = startOfWeek(base, { weekStartsOn: 1 })
    const endRange = endOfWeek(base, { weekStartsOn: 1 })
    const startStr = format(startRange, 'yyyy-MM-dd')
    const endStr = format(endRange, 'yyyy-MM-dd')

    // 2️⃣ Determina col·leccions a llegir
    let collections = ['stage_verd', 'stage_taronja', 'stage_blau', 'stage_lila']
    if (stage === 'verd') collections = ['stage_verd']
    else if (stage === 'taronja') collections = ['stage_taronja', 'stage_blau']

    console.log('🔍 START getSpacesByWeek', { startStr, endStr, collections })

    // 3️⃣ Llegeix totes les col·leccions dins el rang
    const rawEvents: RawEvent[] = []
    for (const col of collections) {
     const startStrISO = startStr.toString()
const endStrISO = endStr.toString() 
      const ref = firestore
        .collection(col)
       .where('DataInici', '<=', endStrISO)
      .where('DataFi', '>=', startStrISO)




      const snap = await ref.get()
      console.log(`📚 Llegint col·lecció ${col} dins rang ${startStr} → ${endStr}`)

      snap.forEach(doc => {
        const d = doc.data()
        const id = doc.id
 let start = d.DataInici
let endRaw = d.DataFinal || d.DataFi || d.DataInici

// 🔧 Accepta tant Timestamp com string
if (start?.toDate) start = start.toDate()
else if (typeof start === 'string') start = new Date(start)

let end = endRaw
if (endRaw?.toDate) end = endRaw.toDate()
else if (typeof endRaw === 'string') end = new Date(endRaw)

// 🛑 Només rebutja si realment no és una data
if (!(start instanceof Date) || isNaN(start.getTime())) {
  console.warn('⚠️ DataInici invàlida:', d.DataInici, 'doc:', id)
  return
}
if (!(end instanceof Date) || isNaN(end.getTime())) {
  console.warn('⚠️ DataFi invàlida:', d.DataFi, 'doc:', id)
  return
}


        const finca = normalizeText((d.Ubicacio || '').split('(')[0])
        const eventName = normalizeText(d.NomEvent)
        const commercial = normalizeText(d.Comercial)
        const ln = normalizeText(d.LN)
        const stageActual = col.replace('stage_', '') as RawEvent['stage']
        const numPax = Number(d.NumPax) || 0
        const startTime = normalizeText(d.HoraInici)
        const service = normalizeText(d.Servei || d.service || '')
        const code = d.code ? normalizeText(d.code) : (d.Code ? normalizeText(d.Code) : '')

        // Filtres recíprocs
        if (
          (fincaFilter && !finca.toLowerCase().includes(fincaFilter.toLowerCase())) ||
          (comercialFilter && !commercial.toLowerCase().includes(comercialFilter.toLowerCase())) ||
          (stage && stage !== 'all' && stageActual !== stage)
        )
          return
if (d.origen === 'manual') {
  console.log('🧩 EVENT MANUAL DETECTAT:', {
    id,
    NomEvent: d.NomEvent,
    Ubicacio: d.Ubicacio,
    DataInici: d.DataInici,
    DataFi: d.DataFi,
    StageGroup: d.StageGroup,
    col
  })
}
        rawEvents.push({
          id,
          finca,
          date: format(start, 'yyyy-MM-dd'),
          dateEnd: format(end, 'yyyy-MM-dd'),
          ln,
          stage: stageActual,
          eventName,
          commercial,
          numPax,
          startTime,
          code,
          service,
        })
      })
    }
  
    // 4️⃣ Expandeix esdeveniments de més d’un dia → duplicar cada dia dins el rang setmanal
    const expanded: RawEvent[] = []
    for (const ev of rawEvents) {
      const start = parseISO(ev.date)
      const end = parseISO(ev.dateEnd || ev.date)
      for (let d = start; d <= end; d = addDays(d, 1)) {
        if (d < startRange || d > endRange) continue // només dies dins la setmana
        expanded.push({ ...ev, date: format(d, 'yyyy-MM-dd') })
      }
    }
    console.log(`📊 Total rawEvents: ${rawEvents.length}`)
const manuals = rawEvents.filter(e => e.eventName.toLowerCase().includes('prova'))
console.log('🧩 DEBUG manual events trobats:', manuals)


    // 5️⃣ Agrupa per finca + dia
    const map = new Map<string, Map<string, RawEvent[]>>()
    for (const ev of expanded) {
      if (!map.has(ev.finca)) map.set(ev.finca, new Map())
      const sub = map.get(ev.finca)!
      if (!sub.has(ev.date)) sub.set(ev.date, [])
      sub.get(ev.date)!.push(ev)
    }

// 6️⃣ Aplica regles d’ocupació (nova lògica: pinta tots, marca conflictes)
const result: SpaceRow[] = []
const totalPaxPerDia = Array(7).fill(0)

for (const [finca, days] of map.entries()) {
  const dies: DayOut[] = Array(7)
    .fill(null)
    .map((_, i) => ({
      date: format(addDays(startRange, i), 'yyyy-MM-dd'),
      events: [],
    }))

  for (let i = 0; i < 7; i++) {
    const dateISO = dies[i].date
    const evs = days.get(dateISO) || []
    if (evs.length === 0) continue

    const eventsOut: EventOut[] = []

    for (const e of evs) {
      // Marca general per conflictes (per defecte cap)
      let warning = false
      let reason = ''

      // 1️⃣ Casament verd amb altres events a la mateixa finca/dia
      const weddingGreen = evs.find(
        (x) => x.stage === 'verd' && isWedding(x.ln)
      )
      if (weddingGreen && e.id !== weddingGreen.id) {
        warning = true
        reason = 'Casament verd en el mateix dia i finca'
      }

      // 2️⃣ Verd Restaurant → sobrepàs teòric de 1000 pax
      if (e.stage === 'verd' && isRestaurant(e.ln)) {
        const totalPax = evs
          .filter((x) => x.stage === 'verd' && isRestaurant(x.ln))
          .reduce((acc, x) => acc + (x.numPax || 0), 0)
        if (totalPax > 1000) {
          warning = true
          reason = 'Possible sobrepàs de 1000 pax Restaurant verd'
        }
      }

      // 3️⃣ Verd Empresa/Grups → menys de 8h de separació
      if (e.stage === 'verd' && isCorporateOrGroups(e.ln)) {
        const evMin = parseHourToMinutes(e.startTime)
        if (evMin != null) {
          const other = evs.find((x) => {
            if (x.id === e.id) return false
            const xMin = parseHourToMinutes(x.startTime)
            return (
              x.stage === 'verd' &&
              isCorporateOrGroups(x.ln) &&
              xMin != null &&
              diffHours(xMin, evMin) <= 8
            )
          })
          if (other) {
            warning = true
            reason = 'Solapament horari ≤8h amb un altre verd Empresa/Grups'
          }
        }
      }

      // 4️⃣ Guarda resultat (sempre es pinta)
      eventsOut.push({
        ...e,
        warning,
        reason,
      })

      // Acumulem pax igualment
      totalPaxPerDia[i] += e.numPax || 0
    }

    // Ordenem per stage com abans
    const order: Record<string, number> = { verd: 0, blau: 1, taronja: 2, lila: 3 }
    eventsOut.sort((a, b) => order[a.stage] - order[b.stage])

    // Assignem resultats del dia
    dies[i].events = eventsOut
  }

  result.push({ finca, dies })
}

console.log(`✅ [getSpacesByWeek] ${result.length} finques — ${startStr} → ${endStr}`)


    // 7️⃣ Ordena finques
    result.sort((a, b) => a.finca.localeCompare(b.finca, 'ca', { sensitivity: 'base' }))

    console.log(`✅ [getSpacesByWeek] ${result.length} finques — ${startStr} → ${endStr}`)
    return { data: result, totalPaxPerDia }
  } catch (err) {
    console.error('[getSpacesByWeek]', err)
    return { data: [], totalPaxPerDia: Array(7).fill(0) }
  }
}
// ──────────────────────────────────────────────────────────────
// EXPORTS PÚBLICS DE TIPUS (per components React)
// ──────────────────────────────────────────────────────────────
export type Stage = 'verd' | 'taronja' | 'blau' | 'lila'
export type { SpaceRow }
