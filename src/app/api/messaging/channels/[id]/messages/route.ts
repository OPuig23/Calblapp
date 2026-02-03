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

async function sendPushToUids(baseUrl: string, uids: string[], title: string, body: string, url: string) {
  if (!uids.length) return
  await Promise.all(
    uids.map((uid) =>
      fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, title, body, url }),
      }).catch(() => {})
    )
  )
}

async function ensureMember(channelId: string, userId: string) {
  const snap = await db
    .collection('channelMembers')
    .where('channelId', '==', channelId)
    .where('userId', '==', userId)
    .limit(1)
    .get()
  return !snap.empty
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const userId = user.id
  const { id } = await ctx.params

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 15), 50)
  const before = searchParams.get('before')

  try {
    const isMember = await ensureMember(id, userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = db
      .collection('messages')
      .where('channelId', '==', id)

    if (before) {
      const beforeNum = Number(before)
      if (!Number.isNaN(beforeNum)) {
        query = query.where('createdAt', '<', beforeNum)
      }
    }

    let snap
    try {
      snap = await query.orderBy('createdAt', 'desc').limit(limit).get()
    } catch (err: any) {
      const msg = String(err?.message || '')
      if (msg.toLowerCase().includes('requires an index')) {
        const fallback = await query.limit(50).get()
        const docs = fallback.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, limit)
        const filtered = docs.filter((m) => {
          if (m.visibility === 'direct') {
            const targets = Array.isArray(m.targetUserIds) ? m.targetUserIds : []
            return targets.includes(userId)
          }
          return true
        })
        return NextResponse.json({ messages: filtered })
      }
      throw err
    }

    let messages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    messages = messages.filter((m: any) => {
      if (m.visibility === 'direct') {
        const targets = Array.isArray(m.targetUserIds) ? m.targetUserIds : []
        return targets.includes(userId) || m.senderId === userId
      }
      return true
    })

    return NextResponse.json({ messages })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const userId = user.id
  const senderName = user.name || ''
  const { id } = await ctx.params

  try {
    const isMember = await ensureMember(id, userId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as {
      text?: string
      visibility?: 'channel' | 'direct'
      targetUserId?: string
      imageUrl?: string
      imagePath?: string
      imageMeta?: { width?: number; height?: number; size?: number; type?: string }
    }
    const text = (body.text || '').toString().trim()
    const imageUrl = (body.imageUrl || '').toString().trim()
    const imagePath = (body.imagePath || '').toString().trim()
    const imageMeta = body.imageMeta || null
    const visibility = body.visibility === 'direct' ? 'direct' : 'channel'
    const targetUserId = (body.targetUserId || '').toString().trim()

    if (!text && !imageUrl) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    if (visibility === 'direct' && !targetUserId) {
      return NextResponse.json({ error: 'Missing target user' }, { status: 400 })
    }

    const now = Date.now()
    const msgRef = db.collection('messages').doc()
    const data = {
      channelId: id,
      senderId: userId,
      senderName,
      body: text,
      imageUrl: imageUrl || null,
      imagePath: imagePath || null,
      imageMeta: imageMeta || null,
      createdAt: now,
      visibility,
      targetUserIds: visibility === 'direct' ? [targetUserId] : [],
      readCount: 0,
    }

    const channelSnap = await db.collection('channels').doc(id).get()
    const channelName = channelSnap.exists ? (channelSnap.data() as any)?.name : ''

    // Get members to update counts
    const membersSnap = await db
      .collection('channelMembers')
      .where('channelId', '==', id)
      .get()

    const memberDocs = membersSnap.docs
    const memberIds = memberDocs.map((d) => d.id)
    const memberUserIds = memberDocs.map((d) => (d.data() as any)?.userId).filter(Boolean)

    if (visibility === 'direct' && !memberUserIds.includes(targetUserId)) {
      return NextResponse.json({ error: 'Target user not in channel' }, { status: 400 })
    }

    const batch = db.batch()
    batch.set(msgRef, data)

    // Update channel preview
    const channelRef = db.collection('channels').doc(id)
    const preview = text ? text.slice(0, 180) : 'Imatge'
    batch.set(
      channelRef,
      {
        lastMessagePreview: preview,
        lastMessageAt: now,
      },
      { merge: true }
    )

    // Update unread counts
    for (const docId of memberIds) {
      const ref = db.collection('channelMembers').doc(docId)
      const member = memberDocs.find((d) => d.id === docId)?.data() as any
      const memberUserId = member?.userId

      if (memberUserId === userId) continue
      if (visibility === 'direct' && memberUserId !== targetUserId) continue

      batch.set(
        ref,
        { unreadCount: Number(member?.unreadCount || 0) + 1 },
        { merge: true }
      )
    }

    await batch.commit()

    // Realtime publish
    const apiKey = process.env.ABLY_API_KEY
    if (apiKey) {
      try {
        const Ably = (await import('ably')).default
        const rest = new Ably.Rest({ key: apiKey })

        if (visibility === 'channel') {
          await rest.channels
            .get(`chat:${id}`)
            .publish('message', { ...data, id: msgRef.id })
        } else {
          await rest.channels
            .get(`user:${targetUserId}:direct`)
            .publish('message', { ...data, id: msgRef.id })
        }

        const recipients = memberDocs
          .map((d) => d.data() as any)
          .map((m) => m.userId)
          .filter((uid) => uid && uid !== userId)
          .filter((uid) => (visibility === 'direct' ? uid === targetUserId : true))

        await Promise.all(
          recipients.map((uid) =>
            rest.channels
              .get(`user:${uid}:inbox`)
              .publish('updated', { channelId: id, at: now })
          )
        )
      } catch {
        // silent
      }
    }

    const recipients = memberDocs
      .map((d) => d.data() as any)
      .map((m) => m.userId)
      .filter((uid) => uid && uid !== userId)
      .filter((uid) => (visibility === 'direct' ? uid === targetUserId : true))

    const mutedUsers = new Set(
      memberDocs
        .map((d) => d.data() as any)
        .filter((m) => m?.muted)
        .map((m) => m.userId)
    )

    const pushRecipients = recipients.filter((uid) => !mutedUsers.has(uid))

    const baseUrl = new URL(req.url).origin
    const title = channelName ? `Missatge: ${channelName}` : 'Nou missatge'
    const pushBody = text ? text.slice(0, 180) : 'Imatge'
    const url = `/menu/missatgeria?channel=${id}`

    await sendPushToUids(baseUrl, pushRecipients, title, pushBody, url)

    return NextResponse.json({ success: true, messageId: msgRef.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
