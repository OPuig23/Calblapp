import { NextResponse } from 'next/server'
import { getSpacesByWeek } from '@/services/spaces/spaces'

/**
 * 🔹 Retorna la llista única de COMERCIALS segons finca + setmana seleccionada.
 * - Filtra per finca si es rep al query param.
 * - Usa el mateix `getSpacesByWeek` per coherència.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get('month') || new Date().getMonth())
    const year = Number(searchParams.get('year') || new Date().getFullYear())
    const baseDate = searchParams.get('baseDate') || undefined
    const finca = searchParams.get('finca') || ''
    const stage = searchParams.get('stage') || 'all'

    const { data } = await getSpacesByWeek(month, year, finca, '', baseDate, stage)

    // 🔹 Extraiem comercials dins dels dies i esdeveniments
    const allComercials = data.flatMap(row =>
      row.dies.flatMap(day =>
        (day.events || [])
          .map(e => e.commercial?.trim())
          .filter(c => !!c)
      )
    )

    const comercials = Array.from(new Set(allComercials)).sort((a, b) =>
      a.localeCompare(b, 'ca', { sensitivity: 'base' })
    )

    return NextResponse.json({ data: comercials }, { status: 200 })
  } catch (err) {
    console.error('[API-SPACES-COMERCIALS]', err)
    return NextResponse.json({ error: 'Error carregant comercials' }, { status: 500 })
  }
}
