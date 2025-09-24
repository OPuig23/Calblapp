// file: src/app/api/transports/route.ts
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

// Afegir transport
export async function POST(req: Request) {
  try {
   

    // 1) Dades d’entrada
    const body = await req.json()
   

    const { plate, type, conductorId } = body

    if (!plate || !type) {
     
      return NextResponse.json({ error: 'Falten camps obligatoris' }, { status: 400 })
    }

    // 2) Validació connexió Firestore
    

    // 3) Intent de creació
    const ref = await firestore.collection('transports').add({
      plate,
      type,
      conductorId: conductorId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // 4) Confirmació
    

    return NextResponse.json({ success: true, id: ref.id })
  } catch (err: any) {
    
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}

// Llegir transports
export async function GET() {
  try {
    

    const snap = await firestore.collection('transports').get()
    

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return NextResponse.json(data)
  } catch (err: any) {
    
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
