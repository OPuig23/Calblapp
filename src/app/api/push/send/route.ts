// file: src/app/api/push/send/route.ts

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import webpush from 'web-push'

export async function POST(req: Request) {
  try {
    console.log('[push/send] ▶️ Inici POST')

    const { userId, title, body, url } = await req.json()

    if (!userId || !title || !body) {
      console.error('[push/send] ❌ Missing fields', { userId, title, body, url })
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    // 🔑 Fem servir els noms de variables que TENS a Vercel
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE
    const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:it@calblay.com'

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      console.error('[push/send] ❌ Falten VAPID_PUBLIC o VAPID_PRIVATE', {
        hasPublic: !!VAPID_PUBLIC,
        hasPrivate: !!VAPID_PRIVATE,
      })
      return NextResponse.json(
        { error: 'Missing VAPID keys' },
        { status: 500 }
      )
    }

    // Config WebPush
    webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC, VAPID_PRIVATE)

    // Llegim totes les subscripcions de l’usuari
    const subsSnap = await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .get()

    if (subsSnap.empty) {
      console.log(`[push/send] ⚠ No subscripcions per userId=${userId}`)
      return NextResponse.json({ success: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body,
      url,
    })

    let sent = 0

    const sendTasks = subsSnap.docs.map(async (doc) => {
      const sub = doc.data().subscription

      try {
        await webpush.sendNotification(sub, payload)
        sent++
      } catch (err: any) {
        console.error('[push/send] Error enviant push:', err?.statusCode, err?.message)

        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await doc.ref.delete()
        }
      }
    })

    await Promise.all(sendTasks)

    console.log('[push/send] ✅ Enviades', sent, 'notificacions')
    return NextResponse.json({ success: true, sent })
  } catch (err) {
    console.error('❌ Error /api/push/send', err)
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
