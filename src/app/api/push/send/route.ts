// file: src/app/api/push/send/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import webpush from 'web-push'

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json(
        { error: 'Missing VAPID keys' },
        { status: 500 }
      )
    }

    // Config WebPush
    webpush.setVapidDetails(
      'mailto:info@calblay.com',
      VAPID_PUBLIC,
      VAPID_PRIVATE
    )

    // Llegim totes les subscripcions del usuari
    const subsSnap = await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .get()

    if (subsSnap.empty) {
      console.log(`⚠ No subscripcions per ${userId}`)
      return NextResponse.json({ success: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
    })

    let sent = 0

    // Enviar notificació a cada dispositiu
    const sendTasks = subsSnap.docs.map(async (doc) => {
      const sub = doc.data().subscription

      try {
        await webpush.sendNotification(sub, payload)
        sent++
      } catch (err: any) {
        console.error('[push] Error enviant push:', err.statusCode)

        // Subscripció caducada → eliminar
        if (err.statusCode === 404 || err.statusCode === 410) {
          await doc.ref.delete()
        }
      }
    })

    await Promise.all(sendTasks)

    return NextResponse.json({ success: true, sent })
  } catch (err) {
    console.error('❌ Error /api/push/send', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
