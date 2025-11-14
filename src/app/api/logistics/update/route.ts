// ✅ file: src/app/api/logistics/update/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { firestoreAdmin } from '@/lib/firebaseAdmin'


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, PreparacioData, PreparacioHora } = body

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Falta ID del document' }, { status: 400 })
    }

    const updateFields: Record<string, any> = {}
    if (PreparacioData) updateFields.PreparacioData = PreparacioData
    if (PreparacioHora) updateFields.PreparacioHora = PreparacioHora

    await db.collection('stage_verd').doc(id).update(updateFields)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Error actualitzant preparació logística:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
