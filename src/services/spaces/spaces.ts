// ✅ file: src/services/spaces/spaces.ts
import { firestore } from '@/lib/firebaseAdmin'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, format, isValid } from 'date-fns'

/**
 * 🔹 Retorna totes les finques amb esdeveniments dins de la SETMANA del `baseDate` (prioritari).
 * - Si no hi ha `baseDate`, agafa la 1a setmana del mes.
 * - Usa sempre DataInici per filtrar.
 * - Inclou stage_lila (reserves manuals o bloquejos d'espais).
 * - Filtra de manera recíproca per finca, comercial i stage.
 * - Permet afegir reserves manuals a mà si cal.
 */
export async function getSpacesByWeek(
  month: number,
  year: number,
  finca: string = '',
  comercialFilter: string = '',
  baseDate?: string,
  stage: string = 'all'
) {
  try {
    // 0️⃣ Rang de dates setmanal
    let startRange: Date
    let endRange: Date

    if (baseDate) {
      const base = new Date(baseDate)
      startRange = startOfWeek(base, { weekStartsOn: 1 })
      endRange = endOfWeek(base, { weekStartsOn: 1 })
    } else {
      const startMonth = startOfMonth(new Date(year, month))
      startRange = startOfWeek(startMonth, { weekStartsOn: 1 })
      endRange = endOfWeek(startRange, { weekStartsOn: 1 })
    }

    const startStr = format(startRange, 'yyyy-MM-dd')
    const endStr = format(endRange, 'yyyy-MM-dd')

    const allDocs: any[] = []
// 🔹 Selecció col·leccions segons estat
let collections = ['stage_verd', 'stage_taronja', 'stage_blau', 'stage_lila']
if (stage === 'verd') {
  collections = ['stage_verd'] // Confirmats
} else if (stage === 'taronja') {
  collections = ['stage_taronja', 'stage_blau'] // Pendents
}


    // 1️⃣ Llegeix totes les col·leccions dins del rang
    for (const col of collections) {
      const ref = firestore
        .collection(col)
        .where('DataInici', '>=', startStr)
        .where('DataInici', '<=', endStr)

      const snap = await ref.get()
      snap.forEach(doc => {
        const d = doc.data()
        const raw = d.DataInici
        if (!raw) return

        let dataInici: Date | null = null
        if (raw?.toDate) dataInici = raw.toDate() // Timestamp
        else if (typeof raw === 'string') dataInici = parseISO(`${raw}T00:00:00Z`)
        if (!dataInici || !isValid(dataInici)) return

        const ubicacio = (d.Ubicacio || 'Sense ubicació').split('(')[0].trim()
        const nomEvent = (d.NomEvent || '').split('/')[0].trim()
        const comercial = (d.Comercial || '').trim()
        const numPax = Number(d.NumPax) || 0
        const stageActual = col.replace('stage_', '') // verd / taronja / blau / lila

        // 🔸 Filtres recíprocs: tots s’han de complir
        if (
          (finca && !ubicacio.toLowerCase().includes(finca.toLowerCase())) ||
          (comercialFilter && !comercial.toLowerCase().includes(comercialFilter.toLowerCase())) ||
          (stage && stage !== 'all' && stageActual !== stage)
        ) {
          return
        }

        allDocs.push({
          Ubicacio: ubicacio,
          DataInici: format(dataInici, 'yyyy-MM-dd'),
          NomEvent: nomEvent,
          Comercial: comercial,
          NumPax: numPax,
          stage: stageActual,
        })
      })
    }

    // 2️⃣ Agrupa per finca i dia
    const groupedByFinca: Record<string, any> = {}
    const priority = { verd: 4, taronja: 3, blau: 2, lila: 1 }

    for (const e of allDocs) {
      if (!groupedByFinca[e.Ubicacio]) {
        groupedByFinca[e.Ubicacio] = { finca: e.Ubicacio, dies: Array(7).fill(null) }
      }

      const date = parseISO(e.DataInici)
      if (date < startRange || date > endRange) continue

      const dayIndex = (date.getDay() + 6) % 7 // dilluns = 0
      const existing = groupedByFinca[e.Ubicacio].dies[dayIndex]
      const shouldReplace = !existing || (priority[e.stage] > priority[existing?.stage || 'lila'])

      if (shouldReplace) {
        groupedByFinca[e.Ubicacio].dies[dayIndex] = {
          eventName: e.NomEvent?.length > 25 ? e.NomEvent.slice(0, 25) + '…' : e.NomEvent,
          commercial: e.Comercial,
          numPax: e.NumPax,
          stage: e.stage,
        }
      }
    }

    // 3️⃣ Inclou espais manuals o reserves creades a mà
    const manualSnap = await firestore
      .collection('stage_lila')
      .where('DataInici', '>=', startStr)
      .where('DataInici', '<=', endStr)
      .get()

    manualSnap.forEach(doc => {
      const d = doc.data()
      const ubicacio = (d.Ubicacio || 'Sense ubicació').split('(')[0].trim()
      if (!groupedByFinca[ubicacio]) {
        groupedByFinca[ubicacio] = { finca: ubicacio, dies: Array(7).fill(null) }
      }
    })

    // 4️⃣ Permet afegir reserves manuals en temps real (si cal)
    // Exemple: pots fer servir aquest patró al back o una API POST
    // await firestore.collection('stage_lila').add({
    //   Ubicacio: 'Font de la Canya',
    //   DataInici: '2025-10-25',
    //   NomEvent: 'Reserva Manual Oriol',
    //   Comercial: 'Direcció',
    //   NumPax: 0
    // })

    // 5️⃣ Calcula totals per dia (només verd)
    const totalPaxPerDia = Array(7).fill(0)
    Object.values(groupedByFinca).forEach((row: any) => {
      row.dies.forEach((cell: any, i: number) => {
        if (cell?.stage === 'verd') totalPaxPerDia[i] += cell.numPax || 0
      })
    })

    // 6️⃣ Ordena alfabèticament
    const result = Object.values(groupedByFinca).sort((a: any, b: any) =>
      a.finca.localeCompare(b.finca, 'ca', { sensitivity: 'base' })
    )

    console.log(`✅ [getSpacesByWeek] ${result.length} finques — ${startStr} → ${endStr}`)
    return { data: result, totalPaxPerDia }
  } catch (err) {
    console.error('[getSpacesByWeek]', err)
    return { data: [], totalPaxPerDia: Array(7).fill(0) }
  }
}
