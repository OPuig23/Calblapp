//file: src/services/spaces/spaces.ts
import { firestore } from '@/lib/firebaseAdmin'
import { startOfWeek, endOfWeek, parseISO } from 'date-fns'

/**
 * 🔹 Retorna els esdeveniments de la setmana actual,
 * filtrats per stage i/o finca, agrupats per ubicació.
 */
export async function getSpacesByWeek(
  week?: string,
  stage: 'verd' | 'blau' | 'taronja' | 'all' = 'all',
  finca: string = ''
) {
  try {
    const collections = ['stage_verd', 'stage_taronja', 'stage_blau']
    const allDocs: any[] = []

    // 1️⃣ Calcular setmana de referència
    const now = week ? parseISO(week) : new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })

    // 2️⃣ Llegir dades de Firestore
    for (const col of collections) {
      // Si hi ha filtre per stage → salta les altres col·leccions
      if (stage !== 'all' && !col.includes(stage)) continue

      const snap = await firestore.collection(col).get()
      snap.forEach((doc) => {
        const d = doc.data()
        const dataInici = parseISO(d.DataInici)
        if (!dataInici || isNaN(dataInici.getTime())) return

        // 🔹 Només esdeveniments dins de la setmana seleccionada
        if (dataInici >= start && dataInici <= end) {
          const ubicacioNeta = (d.Ubicacio || 'Sense ubicació')
            .split('(')[0]
            .trim()
          const eventName = (d.NomEvent || '').split('/')[0].trim()

          // 🔹 Si hi ha filtre per finca, comprova coincidència
          if (
            finca &&
            !ubicacioNeta
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .includes(
                finca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              )
          )
            return

          allDocs.push({
            Ubicacio: ubicacioNeta,
            DataInici: d.DataInici,
            NomEvent: eventName,
            Comercial: d.Comercial || '',
            collection: col.replace('stage_', ''), // verd / blau / taronja
          })
        }
      })
    }

    // 3️⃣ Agrupar per finca i per dia
    const groupedByFinca: Record<string, any> = {}
    for (const e of allDocs) {
      if (!groupedByFinca[e.Ubicacio]) {
        groupedByFinca[e.Ubicacio] = {
          finca: e.Ubicacio,
          dies: Array(7).fill(null),
        }
      }
      const date = new Date(e.DataInici)
      const dayIndex = (date.getDay() + 6) % 7 // dilluns = 0
      groupedByFinca[e.Ubicacio].dies[dayIndex] = {
        eventName: e.NomEvent.length > 25 ? e.NomEvent.slice(0, 25) + '…' : e.NomEvent,
        commercial: e.Comercial,
        stage: e.collection,
      }
    }

    // 4️⃣ Ordenar alfabèticament per nom de finca
    const result = Object.values(groupedByFinca).sort((a: any, b: any) =>
      a.finca.localeCompare(b.finca, 'ca', { sensitivity: 'base' })
    )

    console.log(`✅ [getSpacesByWeek] ${result.length} finques trobades`)
    return result
  } catch (err) {
    console.error('[getSpacesByWeek]', err)
    return []
  }
}
