//file: src/app/api/calendar/manual/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * 📥 POST — Crea un nou esdeveniment manual a la col·lecció "esdeveniments"
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validacions mínimes
    if (!body.NomEvent) {
      return NextResponse.json(
        { error: 'Falta el camp obligatori: NomEvent' },
        { status: 400 }
      )
    }

    // 🔹 Dades a desar
    const newEvent = {
  NomEvent: body.NomEvent,
  Servei: body.Servei || '',
  Comercial: body.Comercial || '',
  DataInici: body.DataInici || body.Data || new Date().toISOString(),
  DataFi: body.DataFi || body.DataInici || body.Data || new Date().toISOString(),
  Hora: body.Hora || '',
  NumPax: body.NumPax ? Number(body.NumPax) : null,
  Ubicacio: body.Ubicacio || '',
  attachments: body.attachments || [],
  origen: 'manual',
  createdAt: new Date().toISOString(),
}


    // 🔥 Desa al Firestore
    const docRef = await firestore.collection('esdeveniments').add(newEvent)

    return NextResponse.json({ id: docRef.id, ...newEvent })
  } catch (error: any) {
    console.error('❌ Error creant esdeveniment manual:', error)
    return NextResponse.json(
      { error: 'Error desant a Firestore', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * 📤 GET — Retorna tots els esdeveniments manuals
 */
export async function GET() {
  try {
    const snapshot = await firestore.collection('esdeveniments').get()
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
