// ✅ file: src/app/api/calendar/manual/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'


export const runtime = 'nodejs'

/**
 * 📥 POST — Crea un nou esdeveniment manual dins la col·lecció "stage_verd"
 * (es considera confirmat per defecte)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ⚠️ Validacions mínimes
    if (!body.NomEvent || !body.DataInici) {
      return NextResponse.json(
        { error: 'Falten camps obligatoris: NomEvent o DataInici' },
        { status: 400 }
      )
    }

    // 🧩 Dades de l’esdeveniment
    const id = `manual_${Date.now()}`
    const newEvent = {
      NomEvent: body.NomEvent,
      Servei: body.Servei || '',
      Comercial: body.Comercial || '',
      LN: body.LN || 'Altres',
      DataInici: body.DataInici || body.Data || new Date().toISOString(),
      DataFi: body.DataFi || body.DataInici || body.Data || new Date().toISOString(),
      Hora: body.Hora || '',
      NumPax: body.NumPax ? Number(body.NumPax) : null,
      Ubicacio: body.Ubicacio || '',
      StageGroup: 'Confirmat',
      origen: 'manual',
      attachments: body.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 🔥 Desa al Firestore dins stage_verd
    await firestoreAdmin.collection('stage_verd').doc(id).set(newEvent)

    return NextResponse.json({ ok: true, id })
  } catch (error: any) {
    console.error('❌ Error creant esdeveniment manual:', error)
    return NextResponse.json(
      { error: 'Error desant a Firestore', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 📤 GET — Retorna tots els esdeveniments manuals (confirmats)
 */
export async function GET() {
  try {
    const snapshot = await firestore
      .collection('stage_verd')
      .where('origen', '==', 'manual')
      .get()

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('❌ Error llegint esdeveniments manuals:', error)
    return NextResponse.json(
      { error: 'Error llegint de Firestore', details: error.message },
      { status: 500 }
    )
  }
}
