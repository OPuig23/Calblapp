// File: src/app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestore } from '@/lib/firebaseAdmin'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  try {
    const ref = firestore
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')

    const snap = await ref.get()
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    if (mode === 'count') {
      const count = docs.filter((d: any) => !d.read).length
      return NextResponse.json({ count })
    }

    if (mode === 'list') {
      return NextResponse.json({ notifications: docs.slice(0, limit) })
    }

    return NextResponse.json({ notifications: docs })
  } catch (err) {
    console.error('[notifications GET] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 })
  }

  try {
    const body = await req.json()
    const action = body.action

    const baseRef = firestore
      .collection('users')
      .doc(userId)
      .collection('notifications')

    // 👉 Marca totes com llegides
    if (action === 'markAllRead') {
      const snap = await baseRef.where('read', '==', false).get()
      const batch = firestore.batch()
      snap.docs.forEach(doc => batch.update(doc.ref, { read: true }))
      await batch.commit()
      return NextResponse.json({ success: true })
    }

    // 👉 Marca notificacions relacionades amb un quadrant
    if (action === 'markQuadrantRead') {
      const { quadrantId } = body
      if (!quadrantId) {
        return NextResponse.json({ error: 'quadrantId required' }, { status: 400 })
      }
      const snap = await baseRef.where('quadrantId', '==', quadrantId).get()
      const batch = firestore.batch()
      snap.docs.forEach(doc => batch.update(doc.ref, { read: true }))
      await batch.commit()
      return NextResponse.json({ success: true })
    }

    // 👉 Marca UNA notificació concreta com llegida
    if (action === 'markRead') {
      const { notificationId } = body
      if (!notificationId) {
        return NextResponse.json({ error: 'notificationId required' }, { status: 400 })
      }
      await baseRef.doc(notificationId).set({ read: true }, { merge: true })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[notifications PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
