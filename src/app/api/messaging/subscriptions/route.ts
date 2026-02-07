import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionUser = {
  id: string
  name?: string
  role?: string
}

const ALLOWED_SOURCES = new Set(['finques', 'restaurants', 'events'])

async function getAllowedChannelIds(userId: string): Promise<string[]> {
  const userSnap = await db.collection('users').doc(userId).get()
  if (!userSnap.exists) return []
  const data = userSnap.data() as any
  const ids = Array.isArray(data?.opsChannelsConfigurable)
    ? data.opsChannelsConfigurable.map(String).filter(Boolean)
    : []
  return ids
}

async function getEventsFlags(userId: string): Promise<{ configurable: boolean; enabled: boolean }> {
  const userSnap = await db.collection('users').doc(userId).get()
  if (!userSnap.exists) return { configurable: false, enabled: false }
  const data = userSnap.data() as any
  const configurable = Boolean(data?.opsEventsConfigurable)
  const enabled = configurable ? Boolean(data?.opsEventsEnabled) : false
  return { configurable, enabled }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const role = normalizeRole(user.role || '')
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId') || user.id

  if (targetUserId !== user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const allowedIds = await getAllowedChannelIds(targetUserId)
    const eventsFlags = await getEventsFlags(targetUserId)
    if (allowedIds.length === 0 && !eventsFlags.configurable) {
      return NextResponse.json({
        channels: [],
        eventsConfigurable: eventsFlags.configurable,
        eventsEnabled: eventsFlags.enabled,
      })
    }

    const [channelsSnap, memberSnap] = await Promise.all([
      db.collection('channels').get(),
      db.collection('channelMembers').where('userId', '==', targetUserId).get(),
    ])

    const subscribed = new Set(
      memberSnap.docs.map((d) => (d.data() as any).channelId).filter(Boolean)
    )

    const channels = channelsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((ch) => ALLOWED_SOURCES.has(String(ch.source || '')))
      .filter((ch) => {
        const source = String(ch.source || '')
        if (source === 'events') return eventsFlags.configurable
        return allowedIds.includes(String(ch.id))
      })
      .map((ch) => ({
        ...ch,
        subscribed: subscribed.has(ch.id),
      }))

    return NextResponse.json({
      channels,
      eventsConfigurable: eventsFlags.configurable,
      eventsEnabled: eventsFlags.enabled,
    })
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
  const role = normalizeRole(user.role || '')

  try {
    const body = (await req.json()) as {
      channelIds?: string[]
      userId?: string
      eventsEnabled?: boolean
    }
    const targetUserId = body.userId || user.id
    if (targetUserId !== user.id && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedIds = await getAllowedChannelIds(targetUserId)
    const allowedSet = new Set(allowedIds)
    const eventsFlags = await getEventsFlags(targetUserId)

    const targetUserSnap = await db.collection('users').doc(targetUserId).get()
    const targetUserName = (targetUserSnap.data() as any)?.name || ''
    const channelIds = Array.isArray(body.channelIds)
      ? body.channelIds.map(String).filter(Boolean)
      : []
    const filteredChannelIds = channelIds.filter((id) => allowedSet.has(id))
    const eventsEnabled =
      typeof body.eventsEnabled === 'boolean' && eventsFlags.configurable
        ? body.eventsEnabled
        : eventsFlags.enabled

    if (eventsFlags.configurable) {
      await db
        .collection('users')
        .doc(targetUserId)
        .set({ opsEventsEnabled: eventsEnabled }, { merge: true })
    }

    const memberSnap = await db
      .collection('channelMembers')
      .where('userId', '==', targetUserId)
      .get()

    const existing = new Set(
      memberSnap.docs.map((d) => (d.data() as any).channelId).filter(Boolean)
    )
    let next = new Set(filteredChannelIds)
    if (eventsFlags.configurable) {
      const eventMemberIds = memberSnap.docs
        .map((d) => (d.data() as any)?.channelId)
        .filter((id) => typeof id === 'string' && id.startsWith('event_'))

      if (eventsEnabled) {
        eventMemberIds.forEach((id) => next.add(id))
      } else {
        eventMemberIds.forEach((id) => next.delete(id))
      }
    }

    const batch = db.batch()

    // Remove old
    memberSnap.docs.forEach((doc) => {
      const chId = (doc.data() as any).channelId
      if (!next.has(chId)) {
        batch.delete(doc.ref)
      }
    })

    // Add new
    for (const chId of filteredChannelIds) {
      if (existing.has(chId)) continue
      const ref = db.collection('channelMembers').doc(`${chId}_${targetUserId}`)
      batch.set(ref, {
        channelId: chId,
        userId: targetUserId,
        userName: targetUserName,
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
