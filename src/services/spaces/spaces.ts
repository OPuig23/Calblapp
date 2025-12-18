// ✅ file: src/services/spaces/spaces.ts
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
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
  date: string
  dateEnd?: string
  ln?: string
  stage: 'verd' | 'taronja' | 'groc'
  eventName: string
  commercial: string
  numPax: number
  startTime?: string
  code?: string
  service?: string
  observacions?: string 
}

interface EventOut extends RawEvent {
  discarded?: boolean
  reason?: string
  warning?: boolean
}

interface DayOut {
  date: string
  events: EventOut[]
}

interface SpaceRow {
  fincaId?: string        // 🔑 ID real de Firestore (finques/{id})
  finca: string           // Nom visible
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
    await db.collection('spaces_conflicts').add({
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
  stage: string = 'all',
  lnFilter: string = ''
)
: Promise<SpacesResult> {
  try {
    // 1️⃣ Calcula rang de setmana
    const base = baseDate ? new Date(baseDate) : new Date(year, month)
    const startRange = startOfWeek(base, { weekStartsOn: 1 })
    const endRange = endOfWeek(base, { weekStartsOn: 1 })
    const startStr = format(startRange, 'yyyy-MM-dd')
    const endStr = format(endRange, 'yyyy-MM-dd')

    // 2️⃣ Determina col·leccions a llegir
let collections: string[] = []

switch (stage) {
  case 'confirmat':      // UI → Confirmats
    collections = ['stage_verd']
    break

  case 'pressupost':     // UI → Pressupost enviat
    collections = ['stage_groc']
    break

  case 'calentet':       // UI → Prereserva / Calentet
    collections = ['stage_taronja']
    break

  default:
    collections = ['stage_verd', 'stage_taronja', 'stage_groc']
}



    console.log('🔍 START getSpacesByWeek', { startStr, endStr, collections })

    // ──────────────────────────────────────────────
// 🔑 Map de finques: NOM (normalitzat) → ID Firestore
// ──────────────────────────────────────────────
const finquesSnap = await db.collection('finques').get()
const fincaIdMap = new Map<string, string>()

finquesSnap.forEach(doc => {
  const d = doc.data() as any
  const nom = normalizeText(d.nom || doc.id)
  if (nom) {
    fincaIdMap.set(nom.toLowerCase(), doc.id)
  }
})


    // 3️⃣ Llegeix totes les col·leccions dins el rang
    const rawEvents: RawEvent[] = []
    for (const col of collections) {
      const startStrISO = startStr.toString()
      const endStrISO = endStr.toString()

      // ✅ Substituït firestore → db
      const ref = db
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
        const observacions = normalizeText(
  d.ObservacionsZoho ||
  d.observacionsZoho ||
  d.Observacions ||
  d.observacions ||
  ''
)


        if (start?.toDate) start = start.toDate()
        else if (typeof start === 'string') start = new Date(start)

        let end = endRaw
        if (endRaw?.toDate) end = endRaw.toDate()
        else if (typeof endRaw === 'string') end = new Date(endRaw)

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

// Filtres
if (
  (fincaFilter &&
    !finca.toLowerCase().includes(fincaFilter.toLowerCase())) ||

  (comercialFilter &&
    !commercial.toLowerCase().includes(comercialFilter.toLowerCase())) ||

  (lnFilter &&
    !ln.toLowerCase().includes(lnFilter.toLowerCase()))
)
  return



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
          observacions,
        })
      })
    }

    // 4️⃣ Expandeix esdeveniments multidia
    const expanded: RawEvent[] = []
    for (const ev of rawEvents) {
      const start = parseISO(ev.date)
      const end = parseISO(ev.dateEnd || ev.date)
      for (let d = start; d <= end; d = addDays(d, 1)) {
        if (d < startRange || d > endRange) continue
        expanded.push({ ...ev, date: format(d, 'yyyy-MM-dd') })
      }
    }

    // 5️⃣ Agrupa per finca i dia
    const map = new Map<string, Map<string, RawEvent[]>>()
    for (const ev of expanded) {
      if (!map.has(ev.finca)) map.set(ev.finca, new Map())
      const sub = map.get(ev.finca)!
      if (!sub.has(ev.date)) sub.set(ev.date, [])
      sub.get(ev.date)!.push(ev)
    }

    // 6️⃣ Aplica regles i genera resultats
    const result: SpaceRow[] = []
    const totalPaxPerDia = Array(7).fill(0)

    for (const [finca, days] of map.entries()) {
      const dies: DayOut[] = Array(7).fill(null).map((_, i) => ({
        date: format(addDays(startRange, i), 'yyyy-MM-dd'),
        events: [],
      }))

      for (let i = 0; i < 7; i++) {
        const dateISO = dies[i].date
        const evs = days.get(dateISO) || []
        if (evs.length === 0) continue

        const eventsOut: EventOut[] = []
        for (const e of evs) {
          let warning = false
          let reason = ''

          const weddingGreen = evs.find(x => x.stage === 'verd' && isWedding(x.ln))
          if (weddingGreen && e.id !== weddingGreen.id) {
            warning = true
            reason = 'Casament verd en el mateix dia i finca'
          }

          if (e.stage === 'verd' && isRestaurant(e.ln)) {
            const totalPax = evs
              .filter(x => x.stage === 'verd' && isRestaurant(x.ln))
              .reduce((acc, x) => acc + (x.numPax || 0), 0)
            if (totalPax > 1000) {
              warning = true
              reason = 'Possible sobrepàs de 1000 pax Restaurant verd'
            }
          }

          if (e.stage === 'verd' && isCorporateOrGroups(e.ln)) {
            const evMin = parseHourToMinutes(e.startTime)
            if (evMin != null) {
              const other = evs.find(x => {
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

          eventsOut.push({ ...e, warning, reason })
          totalPaxPerDia[i] += e.numPax || 0
        }

        const order: Record<string, number> = { verd: 0, taronja: 1, groc: 2 }
        eventsOut.sort((a, b) => order[a.stage] - order[b.stage])
        dies[i].events = eventsOut
      }

      const fincaId = fincaIdMap.get(finca.toLowerCase())

result.push({
  finca,
  fincaId,
  dies,
})

    }

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
export type Stage = 'verd' | 'taronja' | 'groc'
