// file: src/app/api/push/subscribe/route.ts

// ❗ OBLIGATORI per evitar 401 i cache a Vercel
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json()

    if (!userId || !subscription) {
      return NextResponse.json(
        { error: 'Falten camps requerits' },
        { status: 400 }
      )
    }

    // 📌 Guardem la subscripció al subdocument:
    // users/{userId}/pushSubscriptions/{autoId}
    await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .add({
        subscription,
        createdAt: Date.now(),
      })

    console.log(`🔔 Subscripció guardada correctament per user ${userId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error guardant subscripció push:', error)
    return NextResponse.json(
      { error: 'Error intern guardant subscripció' },
      { status: 500 }
    )
  }
}
