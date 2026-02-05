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

    const members = membersSnap.docs.map((d) => {
      const data = d.data() as any
      return {
        userId: data.userId,
        userName: data.userName || '',
      }
    })

    return NextResponse.json({ members })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
