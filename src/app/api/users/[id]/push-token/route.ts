// file: src/app/api/users/[id]/push-token/route.ts
import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

interface PushTokenPayload {
  token?: string
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await req.json()) as PushTokenPayload
    const token = body.token?.trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    // 🔹 Guardem el token al document d'usuari
  await db.collection('users').doc(params.id).set(
  {
    pushToken: token,
    pushEnabled: true,     // 👈 AFEGIT
    updatedAt: Date.now(),
  },
  { merge: true }
)


    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[push-token] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
