//file: src/app/api/calendar/manual/[id]/route.ts
// ✅ Vercel-ready: Node runtime + firebase-admin
import { NextResponse } from 'next/server'
import { firestore } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { collection, ...data } = body as { collection?: string; [k: string]: any }

    if (!collection || !collection.startsWith('stage_')) {
      return NextResponse.json({ error: 'Falta o és invàlida la col·lecció' }, { status: 400 })
    }

    await firestore.collection(collection).doc(params.id).set(
      { ...data, updatedAt: new Date().toISOString() },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ PUT manual:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Error actualitzant' }, { status: 500 })
  }
}

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
