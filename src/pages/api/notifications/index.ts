//file: src/pages/api/notifications/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestore } from '@/lib/firebaseAdmin'

const COLLECTION = 'notifications'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { mode = 'list', limit = 50, type } = req.query

      let ref = firestore.collection(COLLECTION)

      if (type) {
        ref = ref.where('type', '==', String(type))
      }

      if (mode === 'count') {
        const snap = await ref.where('read', '==', false).get()
        return res.status(200).json({ ok: true, count: snap.size })
      }

      if (mode === 'list') {
        const snap = await ref.orderBy('createdAt', 'desc').limit(Number(limit)).get()
        const notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return res.status(200).json({ ok: true, notifications })
      }
    }

    if (req.method === 'PATCH') {
      const { action, notificationId, type } = req.body

      if (action === 'markRead' && notificationId) {
        await firestore.collection(COLLECTION).doc(notificationId).update({ read: true })
        return res.status(200).json({ ok: true })
      }

      if (action === 'markReadAll' && type) {
        const snap = await firestore.collection(COLLECTION)
          .where('type', '==', String(type))
          .where('read', '==', false)
          .get()

        const batch = firestore.batch()
        snap.forEach(doc => batch.update(doc.ref, { read: true }))
        await batch.commit()

        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ ok: false, error: 'Invalid action' })
    }

    if (req.method === 'POST') {
      const { title, body, type, tornId, userId } = req.body
      if (!title || !body || !type) {
        return res.status(400).json({ ok: false, error: 'Missing fields' })
      }

      const ref = await firestore.collection(COLLECTION).add({
        title,
        body,
        type, // 'user_request' o 'torn_assigned'
        tornId: tornId || null,
        userId: userId || null,
        read: false,
        createdAt: Date.now(),
      })

      return res.status(201).json({ ok: true, id: ref.id })
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  } catch (err: any) {
    console.error('Error /api/notifications:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
