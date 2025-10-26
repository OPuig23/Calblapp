// ✅ file: src/services/spaces/spaces.ts
import { firestore } from '@/lib/firebaseAdmin'
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
}

interface EventOut extends RawEvent {
  discarded?: boolean
  reason?: string
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

    // 3️⃣ Llegeix totes les col·leccions dins el rang
    const rawEvents: RawEvent[] = []
    for (const col of collections) {
      const ref = firestore
  .collection(col)
  .where('DataInici', '<=', endStr)
  .where('DataFi', '>=', startStr)


      const snap = await ref.get()
      snap.forEach(doc => {
        const d = doc.data()
        const id = doc.id
        const start = d.DataInici?.toDate ? d.DataInici.toDate() : parseISO(d.DataInici)
        const endRaw = d.DataFinal || d.DataFi || d.DataInici
const end = endRaw?.toDate ? endRaw.toDate() : parseISO(endRaw)

        if (!isValid(start) || !isValid(end)) return

        const finca = normalizeText((d.Ubicacio || '').split('(')[0])
        const eventName = normalizeText(d.NomEvent)
        const commercial = normalizeText(d.Comercial)
        const ln = normalizeText(d.LN)
        const stageActual = col.replace('stage_', '') as RawEvent['stage']
        const numPax = Number(d.NumPax) || 0
        const startTime = normalizeText(d.HoraInici)

        // Filtres recíprocs
        if (
          (fincaFilter && !finca.toLowerCase().includes(fincaFilter.toLowerCase())) ||
          (comercialFilter && !commercial.toLowerCase().includes(comercialFilter.toLowerCase())) ||
          (stage && stage !== 'all' && stageActual !== stage)
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

    // 5️⃣ Agrupa per finca + dia
    const map = new Map<string, Map<string, RawEvent[]>>()
    for (const ev of expanded) {
      if (!map.has(ev.finca)) map.set(ev.finca, new Map())
      const sub = map.get(ev.finca)!
      if (!sub.has(ev.date)) sub.set(ev.date, [])
      sub.get(ev.date)!.push(ev)
    }

    // 6️⃣ Aplica regles d’ocupació
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

        // — 6.1 Casament verd bloqueja tot —
        const weddingGreen = evs.find(e => e.stage === 'verd' && isWedding(e.ln))
        if (weddingGreen) {
          dies[i].events.push(weddingGreen)
          // Marca la resta com descartats
          for (const e of evs) {
            if (e.id !== weddingGreen.id)
              await logConflict(e, 'Bloquejat per casament verd en aquesta finca/dia')
          }
          totalPaxPerDia[i] += weddingGreen.numPax
          continue
        }

        // — 6.2 Resta de verds segons LN —
        const accepted: EventOut[] = []
        const conflicts: { ev: RawEvent; reason: string }[] = []

        const greens = evs.filter(e => e.stage === 'verd')
        const blues = evs.filter(e => e.stage === 'blau')
        const oranges = evs.filter(e => e.stage === 'taronja')
        const lilas = evs.filter(e => e.stage === 'lila')

        // a) Verd Restaurant → fins a 110 pax totals
        let paxRestaurant = 0
        for (const e of greens.filter(x => isRestaurant(x.ln))) {
          const nextTotal = paxRestaurant + (e.numPax || 0)
          if (nextTotal <= 110) {
            accepted.push(e)
            paxRestaurant = nextTotal
          } else {
            conflicts.push({ ev: e, reason: 'Límit 110 pax Restaurant verd excedit' })
          }
        }

        // b) Verd Empresa/Grups → separació d’hores > 8h
        const corpAccepted: RawEvent[] = []
        for (const e of greens.filter(x => isCorporateOrGroups(x.ln))) {
          const evMin = parseHourToMinutes(e.startTime)
          if (evMin == null) {
            conflicts.push({ ev: e, reason: 'Falta HoraInici per regla >8h' })
            continue
          }
          const ok = corpAccepted.every(a => {
            const aMin = parseHourToMinutes(a.startTime)
            return aMin != null && diffHours(aMin, evMin) > 8
          })
          if (ok) {
            corpAccepted.push(e)
            accepted.push(e)
          } else {
            conflicts.push({ ev: e, reason: 'Solapament horari ≤8h amb un altre verd Empresa/Grups' })
          }
        }

        // c) Altres verds sense LN específica → acceptem
        for (const e of greens.filter(x => !x.ln)) accepted.push(e)

        // d) Taronja/blau/lila → sempre
        accepted.push(...blues, ...oranges, ...lilas)

        // e) Ordena: verd → blau → taronja → lila
        const order: Record<string, number> = { verd: 0, blau: 1, taronja: 2, lila: 3 }
        accepted.sort((a, b) => order[a.stage] - order[b.stage])

        // f) Guarda conflictes
        for (const c of conflicts) await logConflict(c.ev, c.reason)

        dies[i].events = accepted
        totalPaxPerDia[i] += accepted.reduce((acc, e) => acc + (e.numPax || 0), 0)
      }

      result.push({ finca, dies })
    }

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
