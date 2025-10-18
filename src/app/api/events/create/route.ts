// file: src/app/api/events/create/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export async function POST(req: Request) {
  try {
    const data = await req.json()

    // Afegim etiquetes internes
    const payload = {
      ...data,
      StageGroup: 'Confirmat',
      origen: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Desa al Firestore dins stage_verd
    const ref = await firestore.collection('stage_verd').add(payload)

    return NextResponse.json({ id: ref.id }, { status: 200 })
  } catch (err: any) {
    console.error('❌ Error desant esdeveniment:', err)
    return NextResponse.json(
      { error: err.message || 'Error intern' },
      { status: 500 }
    )
  }
}
