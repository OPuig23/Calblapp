// ✅ file: src/app/api/calendar/manual/[id]/route.ts
// Vercel-ready: Node runtime + firebase-admin
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

/**
 * 🟢 POST — Afegeix o actualitza un fitxer adjunt (file1, file2, ...)
 */
/**
 * 🟢 POST — Afegeix o actualitza un fitxer adjunt (file1, file2, ...)
 * Cridat directament des del AttachFileButton
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const body = await req.json()
    const { collection = 'stage_verd', field = 'file1', url } = body

    if (!collection || !id || !url) {
      return NextResponse.json(
        { error: 'Falten camps obligatoris (collection, id, url)' },
        { status: 400 }
      )
    }

    await firestore
      .collection(collection)
      .doc(id)
      .set({ [field]: url, updatedAt: new Date().toISOString() }, { merge: true })

    console.log(`✅ Fitxer ${field} desat correctament a ${collection}/${id}`)
    return NextResponse.json({ ok: true, field, url })
  } catch (err) {
    console.error('❌ Error POST fitxer manual:', err)
    return NextResponse.json({ error: 'Error desant fitxer' }, { status: 500 })
  }
}

/**
 * ✏️ PUT — Actualitza camps generals de l’esdeveniment
 */
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
    console.error('❌ Error actualitzant esdeveniment:', err)
    return NextResponse.json({ error: 'Error actualitzant' }, { status: 500 })
  }
}

/**
 * 🗑️ DELETE — Elimina esdeveniment complet
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const collection = url.searchParams.get('collection')
    if (!collection || !collection.startsWith('stage_')) {
      return NextResponse.json({ error: 'Col·lecció invàlida' }, { status: 400 })
    }

    await firestore.collection(collection).doc(params.id).delete()
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ Error DELETE:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Error eliminant' }, { status: 500 })
  }
}
