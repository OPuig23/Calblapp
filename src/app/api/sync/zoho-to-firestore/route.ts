// ✅ filename: src/app/api/sync/zoho-to-firestore/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { syncZohoDealsToFirestore } from '@/services/zoho/sync'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode')

    // 🟢 1️⃣ SI ÉS CRON → SALTEM AUTH COMPLETAMENT
    if (mode === 'cron') {
      const result = await syncZohoDealsToFirestore()
      return NextResponse.json({
        ok: true,
        mode: 'cron',
        ...result,
        timestamp: new Date().toISOString(),
      })
    }

    // 🔐 2️⃣ SI NO ÉS CRON → ÉS MANUAL → VALIDAR ADMIN
    const session = await getServerSession(authOptions)
    const role = String(session?.user?.role || '').toLowerCase()

    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Accés denegat: només ADMIN pot sincronitzar manualment.' },
        { status: 403 }
      )
    }

    const result = await syncZohoDealsToFirestore()

    return NextResponse.json({
      ok: true,
      mode: 'manual',
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error a /api/sync/zoho-to-firestore:', error)
    return NextResponse.json(
      { error: 'Error durant la sincronització Zoho → Firestore' },
      { status: 500 }
    )
  }
}

