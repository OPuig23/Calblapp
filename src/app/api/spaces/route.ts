// src/app/api/spaces/route.ts
import { NextResponse } from 'next/server'
import { getSpacesByWeek } from '@/services/spaces/spaces'

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)

  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const finca = searchParams.get('finca') || ''
  const comercial = searchParams.get('comercial') || ''
  const baseDate = searchParams.get('baseDate') || undefined

  const today = new Date()
  const month = monthParam ? parseInt(monthParam, 10) : today.getMonth()
  const year = yearParam ? parseInt(yearParam, 10) : today.getFullYear()

  try {
    const { data, totalPaxPerDia } = await getSpacesByWeek(
      month,
      year,
      finca,
      comercial,
      baseDate
    )
    return NextResponse.json({ data, totalPaxPerDia }, { status: 200 })
  } catch (error) {
    console.error('[API-SPACES]', error)
    return NextResponse.json(
      { error: 'Error carregant dades de disponibilitat' },
      { status: 500 }
    )
  }
}
