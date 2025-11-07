// ✅ file: src/app/api/events/create/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'


export const runtime = 'nodejs'

/**
 * 📥 POST — Crea un nou esdeveniment manual dins la col·lecció "stage_verd"
 */
export async function POST(req: Request) {
  try {
    const data = await req.json()

    // 🧩 Validació mínima
    if (!data.NomEvent || !data.DataInici) {
      return NextResponse.json(
        { error: 'Falten camps obligatoris: NomEvent o DataInici' },
        { status: 400 }
      )
    }

    // 🧠 Prepara l’objecte a desar
    const id = `manual_${Date.now()}`
    const payload = {
      id,
      NomEvent: data.NomEvent,
      Servei: data.Servei || '',
      Comercial: data.Comercial || '',
      LN: data.LN || 'Altres',
      StageGroup: 'Confirmat',
      collection: 'stage_verd',
      origen: 'manual',
      DataInici: data.DataInici || data.Data || new Date().toISOString(),
      DataFi: data.DataFi || data.DataInici || data.Data || new Date().toISOString(),
      Ubicacio: data.Ubicacio || '',
      NumPax: data.NumPax ? Number(data.NumPax) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 🪵 Log per verificar que el LN arriba correctament
    console.log('🔥 Event creat →', {
      id: payload.id,
      NomEvent: payload.NomEvent,
      LN: payload.LN,
      DataInici: payload.DataInici,
      StageGroup: payload.StageGroup,
    })

    // 🔥 Desa a Firestore
    await firestore.collection('stage_verd').doc(id).set(payload)

    return NextResponse.json({ ok: true, id }, { status: 200 })
  } catch (err: any) {
    console.error('❌ Error creant esdeveniment manual:', err)
    return NextResponse.json(
      { error: 'Error desant a Firestore', details: err.message },
      { status: 500 }
    )
  }
}
