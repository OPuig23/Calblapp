// file: src/app/api/modifications/[id]/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin } from '@/lib/firebaseAdmin'
import admin from 'firebase-admin'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const payload = await req.json()

    const docRef = firestoreAdmin.collection('modifications').doc(id)
    const snap = await docRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Modificació no trobada' }, { status: 404 })
    }

    const toUpdate = {
      ...payload,
      updatedAt: admin.firestore.Timestamp.now(),
    }

    await docRef.set(toUpdate, { merge: true })

    const updated = await docRef.get()

    return NextResponse.json(
      { modification: { id: updated.id, ...updated.data() } },
      { status: 200 }
    )
  } catch (err) {
    console.error('[modifications PATCH] error', err)
    return NextResponse.json({ error: 'Error intern' }, { status: 500 })
  }
}
