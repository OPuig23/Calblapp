// file: src/app/api/calendar/manual/[id]/route.ts
// ✅ Vercel-ready: Node runtime + firebase-admin
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

// 🟢 CREA un nou esdeveniment (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { collection = 'stage_verd', ...data } = body

    if (!data.NomEvent || !data.DataInici) {
      return NextResponse.json({ error: 'NomEvent i DataInici són obligatoris' }, { status: 400 })
    }

    const id = data.idZoho || `manual_${Date.now()}`
    await firestore.collection(collection).doc(id).set(
      {
        ...data,
        origen: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('❌ Error creant esdeveniment:', err)
    return NextResponse.json({ error: 'Error creant esdeveniment' }, { status: 500 })
  }
}

// ✏️ ACTUALITZA un esdeveniment (PUT)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const body = await req.json()
    const { collection, ...data } = body

    if (!collection) {
      return NextResponse.json({ error: 'Falta la col·lecció' }, { status: 400 })
    }

    await firestore
      .collection(collection)
      .doc(id)
      .set({ ...data, updatedAt: new Date().toISOString() }, { merge: true })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Error actualitzant:', err)
    return NextResponse.json({ error: 'Error actualitzant' }, { status: 500 })
  }
}


// 🗑️ ELIMINA un esdeveniment (DELETE)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const collection = url.searchParams.get('collection')

    if (!collection || !collection.startsWith('stage_')) {
      return NextResponse.json({ error: 'Falta o és invàlida la col·lecció' }, { status: 400 })
    }

    await firestore.collection(collection).doc(params.id).delete()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ DELETE manual:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Error eliminant' }, { status: 500 })
  }
}
