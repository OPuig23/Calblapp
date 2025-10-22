//file: src/app/api/spaces/route.ts
// ✅ API GET /api/spaces
// Retorna la disponibilitat d’espais per setmana (consulta Firestore)

import { NextResponse } from 'next/server'
import { getSpacesByWeek } from '@/services/spaces/spaces'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const week = searchParams.get('week') || undefined
  const stage = searchParams.get('stage') || 'all'
  const finca = searchParams.get('finca') || ''

  try {
    const data = await getSpacesByWeek(week, stage, finca)
    return NextResponse.json({ spaces: data }, { status: 200 })
  } catch (error) {
    console.error('[API-SPACES]', error)
    return NextResponse.json(
      { error: 'Error carregant dades' },
      { status: 500 }
    )
  }
}
