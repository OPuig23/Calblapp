// ✅ filename: src/app/api/sync/zoho-to-firestore/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { syncZohoDealsToFirestore } from '@/services/zoho/sync'

// ──────────────────────────────────────────────
// 🔹 OBJECTIU
// Endpoint per sincronitzar automàticament o manualment
// 🔄 Llegeix oportunitats de Zoho CRM → desa a Firestore
// 🔸 Execució automàtica (cron) o manual (ADMIN)
// ──────────────────────────────────────────────

export const runtime = 'nodejs' // ⚠️ Obligatori: firebase-admin no funciona a edge

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') || 'manual'

    // 1️⃣ Validació de permisos
    if (mode === 'manual') {
      const session = await getServerSession(authOptions)
      const role = String(session?.user?.role || '').toLowerCase()

      if (role !== 'admin') {
        return NextResponse.json(
          { error: 'Accés denegat: només ADMIN pot executar la sincronització manual.' },
          { status: 403 },
        )
      }
    }

    // 2️⃣ Execució sincronització (Zoho → Firestore)
    const result = await syncZohoDealsToFirestore()

    // 3️⃣ Retorn resum
    return NextResponse.json({
      ok: true,
      mode,
      updated: result.updatedCount ?? 0,
      created: result.createdCount ?? 0,
      removed: result.removedCount ?? 0,
      total: result.totalCount ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Error a /api/sync/zoho-to-firestore:', error)

    return NextResponse.json(
      { error: 'Error durant la sincronització Zoho → Firestore' },
      { status: 500 },
    )
  }
}
