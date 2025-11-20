//filename: src/app/api/quadrants/details/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = (searchParams.get('code') || '').trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ error: 'Falta el codi' }, { status: 400 })
    }

    console.log('🔎 [quadrants/details] Buscant dades per code:', code)

    // 1️⃣ Buscar dins les col·leccions de stage
    const stageCollections = ['stage_blau', 'stage_taronja', 'stage_verd']
    let stageData: any = null

    for (const col of stageCollections) {
      const snap = await db.collection(col).where('code', '==', code).limit(1).get()
      if (!snap.empty) {
        const d = snap.docs[0].data()
        stageData = {
          comercial: d.comercial || '',
          servei: d.servei || '',
          stageColor: col.replace('stage_', ''),
        }
        break
      }
    }

    // 2️⃣ Buscar coincidències en altres departaments
    const quadrantCollections = ['quadrantsServeis', 'quadrantsCuina', 'quadrantsLogistica']
    const departaments: Record<
      string,
      { responsable?: string; startTime?: string; conductors?: any[]; treballadors?: any[] }
    > = {}

    for (const col of quadrantCollections) {
      const snap = await db.collection(col).where('code', '==', code).limit(1).get()
      if (!snap.empty) {
        const d = snap.docs[0].data() as any
        const dept = d.department?.toLowerCase() || col.replace('quadrants', '').toLowerCase()

        departaments[dept] = {
          responsable: d.responsable?.name || '',
          startTime: d.startTime || '',
          conductors: Array.isArray(d.conductors) ? d.conductors : [],
          treballadors: Array.isArray(d.treballadors) ? d.treballadors : [],
        }
      }
    }

    return NextResponse.json({
      ok: true,
      code,
      stage: stageData,
      departaments,
    })
  } catch (err: any) {
    console.error('❌ [quadrants/details] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Error intern del servidor' },
      { status: 500 }
    )
  }
}
