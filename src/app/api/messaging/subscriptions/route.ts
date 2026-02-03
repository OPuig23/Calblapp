import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionUser = {
  id: string
  name?: string
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const userId = user.id

  try {
    const [channelsSnap, memberSnap] = await Promise.all([
      db.collection('channels').get(),
      db.collection('channelMembers').where('userId', '==', userId).get(),
    ])

    const subscribed = new Set(
      memberSnap.docs.map((d) => (d.data() as any).channelId).filter(Boolean)
    )

    const channels = channelsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
      subscribed: subscribed.has(d.id),
    }))

    return NextResponse.json({ channels })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const userId = user.id
  const userName = user.name || ''

  try {
    const body = (await req.json()) as { channelIds?: string[] }
    const channelIds = Array.isArray(body.channelIds)
      ? body.channelIds.map(String).filter(Boolean)
      : []

    const memberSnap = await db
      .collection('channelMembers')
      .where('userId', '==', userId)
      .get()

    const existing = new Set(
      memberSnap.docs.map((d) => (d.data() as any).channelId).filter(Boolean)
    )
    const next = new Set(channelIds)

    const batch = db.batch()

    // Remove old
    memberSnap.docs.forEach((doc) => {
      const chId = (doc.data() as any).channelId
      if (!next.has(chId)) {
        batch.delete(doc.ref)
      }
    })

    // Add new
    for (const chId of channelIds) {
      if (existing.has(chId)) continue
      const ref = db.collection('channelMembers').doc(`${chId}_${userId}`)
      batch.set(ref, {
        channelId: chId,
        userId,
        userName,
        role: 'member',
        joinedAt: Date.now(),
        unreadCount: 0,
      })
    }

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
