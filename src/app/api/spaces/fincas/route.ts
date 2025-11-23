// src/app/api/spaces/fincas/route.ts
import { NextResponse } from 'next/server'
import { getSpacesByWeek } from '@/services/spaces/spaces'

/**
 * 🔹 Retorna la llista única de FINQUES amb esdeveniments dins la setmana seleccionada.
 * - Usa el mateix `getSpacesByWeek` per coherència.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get('month') || new Date().getMonth())
    const year = Number(searchParams.get('year') || new Date().getFullYear())
    const baseDate = searchParams.get('baseDate') || undefined
    const stage = searchParams.get('stage') || 'all'

    const { data } = await getSpacesByWeek(month, year, '', '', baseDate, stage)

    // 🔹 Extraiem totes les finques úniques
    const fincas = Array.from(
      new Set(data.map(row => row.finca?.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }))

    return NextResponse.json({ data: fincas }, { status: 200 })
  } catch (err) {
    console.error('[API-SPACES-FINCAS]', err)
    return NextResponse.json({ error: 'Error carregant finques' }, { status: 500 })
  }
}
