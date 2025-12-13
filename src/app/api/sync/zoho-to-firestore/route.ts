// ✅ filename: src/app/api/sync/zoho-to-firestore/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { syncZohoDealsToFirestore } from '@/services/zoho/sync'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') || 'manual'

    // ✅ CRON: validar secret i NO tocar next-auth
    if (mode === 'cron') {
      const secret = req.headers.get('x-cron-secret') || url.searchParams.get('secret')
      if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Accés denegat: CRON_SECRET incorrecte.' }, { status: 403 })
      }
    }

    // ✅ MANUAL: només ADMIN
    if (mode === 'manual') {
      const session = await getServerSession(authOptions)
      const role = String(session?.user?.role || '').toLowerCase()
      if (role !== 'admin') {
        return NextResponse.json(
          { error: 'Accés denegat: només ADMIN pot sincronitzar manualment.' },
          { status: 403 }
        )
      }
    }

    const result = await syncZohoDealsToFirestore()

    return NextResponse.json({
      ok: true,
      mode,
      created: result.createdCount,
      deletedOld: result.deletedCount,
      total: result.totalCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Error a /api/sync/zoho-to-firestore:', error)
    return NextResponse.json(
      { error: 'Error durant la sincronització Zoho → Firestore' },
      { status: 500 }
    )
  }
}
