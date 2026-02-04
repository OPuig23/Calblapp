// file: src/app/api/push/send/route.ts

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
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

    const VAPID_PUBLIC = process.env.VAPID_PUBLIC
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE
    const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:it@calblay.com'

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json(
        { error: 'Missing VAPID keys' },
        { status: 500 }
      )
    }

    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE)

    const subsSnap = await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .get()

    if (subsSnap.empty) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/icons/cb.svg',
      badge: '/icons/cb.svg',
    })
    let sent = 0

    const sendTasks = subsSnap.docs.map(async (doc) => {
      const sub = doc.data().subscription
      try {
        await webpush.sendNotification(sub, payload, {
          TTL: 60 * 60,
          urgency: 'high',
        })
        sent++
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await doc.ref.delete()
        }
      }
    })

    await Promise.all(sendTasks)

    return NextResponse.json({ success: true, sent })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
