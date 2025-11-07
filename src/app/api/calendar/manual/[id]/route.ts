// ✅ file: src/app/api/calendar/manual/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

/**
 * 🟢 POST — Desa o actualitza un fitxer adjunt (file1, file2, ...)
 * Cridat des de l'AttachFileButton
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const body = await req.json()
    const { collection = 'stage_verd', field = 'file1', url } = body as {
      collection?: string
      field?: string
      url?: string
    }

    if (!collection || !id || !url) {
      return NextResponse.json(
        { error: 'Falten camps obligatoris (collection, id, url)' },
        { status: 400 }
      )
    }

    await db
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
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params

  try {
    const body = await req.json()
    const { collection, ...data } = body as Record<string, unknown>

    if (!collection || typeof collection !== 'string') {
      console.error('❌ Falta la col·lecció o és invàlida:', collection)
      return NextResponse.json({ error: 'Falta la col·lecció' }, { status: 400 })
    }

    await db
      .collection(collection)
      .doc(id)
      .set({ ...data, updatedAt: new Date().toISOString() }, { merge: true })

    console.log(`✅ Esdeveniment ${id} actualitzat correctament a ${collection}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Error actualitzant esdeveniment:', err)
    return NextResponse.json({ error: 'Error actualitzant esdeveniment' }, { status: 500 })
  }
}

/**
 * 🗑️ DELETE — Elimina l’esdeveniment complet
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const url = new URL(req.url)
    const collection = url.searchParams.get('collection')

    if (!collection || !collection.startsWith('stage_')) {
      console.error('❌ Col·lecció invàlida o buida:', collection)
      return NextResponse.json({ error: 'Col·lecció invàlida' }, { status: 400 })
    }

    await db.collection(collection).doc(params.id).delete()

    console.log(`🗑️ Esdeveniment ${params.id} eliminat de ${collection}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ Error DELETE:', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Error eliminant esdeveniment' },
      { status: 500 }
    )
  }
}
