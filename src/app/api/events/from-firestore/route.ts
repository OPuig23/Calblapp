//file: src/app/api/events/from-firestore/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
// 100% compatible amb Vercel

/**
 * 📅 API — Llegeix tots els esdeveniments del Firestore unificats
 * - stage_blau   → prereserva / calentet
 * - stage_taronja → proposta / pendent de signar / rq
 * - stage_verd   → confirmats
 * - permet integrar el calendari, esdeveniments i quadrants
 */
export async function GET() {
  try {
    const collections = ['stage_blau', 'stage_taronja', 'stage_verd']
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

    // 🧩 Ordenem per data
    results.sort(
      (a, b) =>
        new Date(a.DataInici || a.Data || 0).getTime() -
        new Date(b.DataInici || b.Data || 0).getTime()
    )

    return NextResponse.json({ data: results, total: results.length })
  } catch (error) {
    console.error('❌ Error llegint esdeveniments de Firestore:', error)
    return NextResponse.json(
      { error: 'Error llegint esdeveniments de Firestore' },
      { status: 500 }
    )
  }
}
