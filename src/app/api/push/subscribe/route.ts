// file: src/app/api/push/subscribe/route.ts
export const runtime = 'nodejs'

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

    // 📌 Guardem les subscripcions dins:
    // users/{userId}/pushSubscriptions/{autoId}
    await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .add({
        subscription,
        createdAt: Date.now(),
      })

    console.log(`🔔 Subscripció guardada per usuari ${userId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error guardant subscripció push:', error)
    return NextResponse.json(
      { error: 'Error intern guardant subscripció' },
      { status: 500 }
    )
  }
}
