// ✅ file: src/app/api/logistics/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subDays,
  isMonday,
  parseISO
} from 'date-fns'



/**
 * 🔹 Endpoint: /api/logistics
 * Retorna els esdeveniments de Firestore filtrats per:
 * - Rang de dates passat per query (?start=YYYY-MM-DD&end=YYYY-MM-DD)
 * - O bé per offset de setmanes (?offset=0, 1, 2)
 * Compatible amb SmartFilters i el mòdul Logística.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    const offset = Number(searchParams.get('offset') ?? '0')

    // 🔹 Si tenim start/end → fem servir el rang directe
    // 🔹 Si no, agafem la setmana actual + offset
    const start = startParam
      ? startOfWeek(parseISO(startParam), { weekStartsOn: 1 })
      : startOfWeek(addWeeks(new Date(), offset), { weekStartsOn: 1 })

    const end = endParam
      ? endOfWeek(parseISO(endParam), { weekStartsOn: 1 })
      : endOfWeek(addWeeks(start, 0), { weekStartsOn: 1 })

    const snapshot = await db
      .collection('stage_verd')
      .where('DataInici', '>=', start)
      .where('DataInici', '<=', end)
      .get()

    const events: {
      id: string
      NomEvent: string
      Ubicacio: string
      NumPax: number
      DataInici: Date
      DataVisual: Date
      HoraInici: string
      PreparacioData: string
      PreparacioHora: string
    }[] = []


    snapshot.forEach((doc) => {
      const ev = doc.data()

      // ❌ Si no té code, no el mostrem
      if (!ev.code || String(ev.code).trim() === '') return

      // 🔹 Convertim DataInici correctament
      const dataInici =
        ev.DataInici?.toDate?.() ??
        new Date(
          typeof ev.DataInici === 'string'
            ? ev.DataInici.replace(' ', 'T')
            : ev.DataInici
        )

      if (isNaN(dataInici.getTime())) return // Data no vàlida

      // 🔹 Dilluns abans de 10h → setmana anterior
      const horaInici = ev.HoraInici ?? ''
      let dataVisual = dataInici
      if (isMonday(dataInici) && horaInici && horaInici < '10:00') {
        dataVisual = subDays(dataInici, 7)
      }

      // 🔹 Filtrar pel rang actiu
      if (dataInici >= start && dataInici <= end) {
        events.push({
          id: doc.id,
          NomEvent: ev.NomEvent ?? ev.eventName ?? '',
          Ubicacio: ev.Ubicacio ?? ev.finca ?? '',
          NumPax: ev.NumPax ?? ev.numPax ?? ev.Pax ?? 0,
          DataInici: dataInici,
          DataVisual: dataVisual,
          HoraInici: horaInici,
          PreparacioData: ev.PreparacioData ?? '',
          PreparacioHora: ev.PreparacioHora ?? ''
        })
      }
    })

    // 🔹 Ordenem per DataInici
    events.sort((a, b) => a.DataInici.getTime() - b.DataInici.getTime())

    return NextResponse.json({
      ok: true,
      count: events.length,
      events
    })
  } catch (err) {
    console.error('❌ Error /api/logistics:', err)
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
