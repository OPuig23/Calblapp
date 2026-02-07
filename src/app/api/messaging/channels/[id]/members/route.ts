import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

export const runtime = 'nodejs'

type SessionUser = { id: string; role?: string }

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as SessionUser
  const userId = user.id
  const role = normalizeRole(user.role || '')
  const { id } = await ctx.params

  try {
    const channelSnap = await db.collection('channels').doc(id).get()
    const channel = channelSnap.exists ? (channelSnap.data() as any) : {}
    const isEventChannel = String(channel?.source || '') === 'events'

    if (role !== 'admin' && role !== 'direccio') {
      const memberCheck = await db
        .collection('channelMembers')
        .where('channelId', '==', id)
        .where('userId', '==', userId)
        .limit(1)
        .get()

      if (memberCheck.empty) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const membersSnap = await db
      .collection('channelMembers')
      .where('channelId', '==', id)
      .get()

    const baseMembers = membersSnap.docs
      .map((d) => {
        const data = d.data() as any
        return {
          userId: data.userId,
          userName: data.userName || '',
          hidden: Boolean(data.hidden),
        }
      })

    const resolveRole = (data: any) =>
      normalizeRole(
        data?.role ||
          data?.rol ||
          data?.nivell ||
          data?.nivel ||
          data?.level ||
          ''
      )

    let hiddenByRole = new Set<string>()
    if (isEventChannel) {
      const ids = baseMembers.map((m) => m.userId).filter(Boolean)
      if (ids.length > 0) {
        const refs = ids.map((uid) => db.collection('users').doc(uid))
        const snaps = await db.getAll(...refs)
        snaps.forEach((doc) => {
          if (!doc.exists) return
          const data = doc.data() as any
          const r = resolveRole(data)
          if (r === 'admin' || r === 'direccio') {
            hiddenByRole.add(doc.id)
          }
        })
      }
    }

    const members = baseMembers.filter((m) => {
      if (m.userId === userId) return true
      if (m.hidden) return false
      if (isEventChannel && hiddenByRole.has(m.userId)) return false
      return true
    })

    return NextResponse.json({ members })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
