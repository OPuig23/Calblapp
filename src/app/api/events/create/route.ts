// ✅ file: src/app/api/events/create/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin } from '@/lib/firebaseAdmin'

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

    // 🆔 ID segur i consistent
    const id = `manual_${Date.now()}`

    // 🧠 Prepara el payload final
    const codeValue = String(data.code || '').trim()
    const hasManualCode = codeValue !== ''

    const payload: Record<string, unknown> = {
      id,
      NomEvent: data.NomEvent,
      Servei: data.Servei || '',
      Comercial: data.Comercial || '',
      LN: data.LN || 'Altres',
      StageGroup: 'Confirmat',
      collection: 'stage_verd',
      origen: 'manual',
      DataInici: data.DataInici,
      DataFi: data.DataFi || data.DataInici,
      HoraInici: data.HoraInici || null,
      Ubicacio: data.Ubicacio || '',
      NumPax: data.NumPax ? Number(data.NumPax) : null,
      code: codeValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (hasManualCode) {
      payload.codeSource = 'manual'
      payload.codeConfirmed = true
    }

    console.log('🔥 Event manual creat:', payload)

    // 🔥 Desa al Firestore amb docId personalitzat
    await firestoreAdmin.collection('stage_verd').doc(id).set(payload)

    // 🟢 IMPORTANT — Retornem ID perquè CalendarNewEventModal pugui adjuntar fitxers
    return NextResponse.json({ success: true, id }, { status: 200 })

  } catch (err: any) {
    console.error('❌ Error creant esdeveniment manual:', err)
    return NextResponse.json(
      { error: 'Error desant a Firestore', details: err.message },
      { status: 500 }
    )
  }
}
