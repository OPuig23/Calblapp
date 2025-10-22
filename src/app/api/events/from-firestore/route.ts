//file: src/app/api/events/from-firestore/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const collections = ['stage_blau', 'stage_taronja', 'stage_verd'] as const
    const results: any[] = []

    for (const name of collections) {
      const snapshot = await firestore.collection(name).get()
      snapshot.forEach((doc) => {
        const data = doc.data()
        results.push({
          id: doc.id,
          ...data,
          StageGroup:
            name === 'stage_blau'
              ? 'Prereserva'
              : name === 'stage_taronja'
              ? 'Proposta'
              : 'Confirmat',
        })
      })
    }

    results.sort(
      (a, b) =>
        new Date(a.DataInici || a.Data || 0).getTime() -
        new Date(b.DataInici || b.Data || 0).getTime()
    )

    if (results[0])
      console.log('🧩 Firestore sample:', {
        LN: results[0].LN,
        Servei: results[0].Servei,
      })

    return NextResponse.json({ data: results, total: results.length })
  } catch (error) {
    console.error('❌ Error llegint esdeveniments de Firestore:', error)
    return NextResponse.json(
      { error: 'Error llegint esdeveniments de Firestore' },
      { status: 500 }
    )
  }
}
