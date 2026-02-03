// src/app/api/user-requests/[id]/reject/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { firestoreAdmin } from '@/lib/firebaseAdmin'

import { normalizeRole } from '@/lib/roles'


export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    console.error('⛔ [reject] Unauthorized')
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const roleNorm = normalizeRole((session.user?.role as string | undefined) || '')
  if (roleNorm !== 'admin') {
    console.error('⛔ [reject] Permís denegat, role:', roleNorm)
    return NextResponse.json({ success: false, error: 'Només Admin' }, { status: 403 })
  }

  const personId = ctx.params.id
  console.log('👉 [reject] personId rebut:', personId)

  try {
    const { reason } = (await req.json().catch(() => ({ reason: '' }))) as { reason?: string }
    console.log('📝 [reject] Motiu rebut:', reason)

    // 1️⃣ Llegim la sol·licitud
    const reqRef = firestoreAdmin.collection('userRequests').doc(personId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) {
      console.warn('❌ [reject] Sol·licitud no trobada a userRequests:', personId)
      return NextResponse.json({ success: false, error: 'Sol·licitud no trobada' }, { status: 404 })
    }

    console.log('📥 [reject] Estat abans:', reqSnap.data())

    // 2️⃣ Actualitzem a userRequests
    await reqRef.set(
      {
        status: 'rejected',
        reason: reason || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    )
    console.log("✅ [reject] Estat actualitzat a 'rejected' a userRequests:", personId)

    // 3️⃣ Relectura de control
    const checkReq = await reqRef.get()
    console.log('🔎 [reject] Estat userRequests després:', checkReq.data())

    // 4️⃣ També actualitzem a personnel
    const personRef = firestoreAdmin.collection('personnel').doc(personId)
    await personRef.set(
      {
        status: 'rejected', // 👈 ara usem el mateix camp que al card
        reason: reason || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    )
    const checkPerson = await personRef.get()
    console.log('🔎 [reject] Estat personnel després:', checkPerson.data())

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[reject user request] error:', error)
    const message = error instanceof Error ? error.message : 'Error intern'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
