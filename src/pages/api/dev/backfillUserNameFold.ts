// file: src/pages/api/dev/backfillUserNameFold.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

const normalize = (s?: string) =>
  String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const snap = await db.collection('users').get()
  const batch = db.batch()
  snap.forEach(doc => {
    const name = (doc.data().name ?? '') as string
    batch.update(doc.ref, { nameFold: normalize(name) })
  })
  await batch.commit()
  res.status(200).json({ ok: true, count: snap.size })
}
