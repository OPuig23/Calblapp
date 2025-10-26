//file: src/pages/api/calendar/attachments.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * Body:
 * {
 *   collection: 'stage_verd' | 'stage_taronja' | 'stage_blau',
 *   docId: string,
 *   field: string,            // p.ex. "Full_Encarrec_file1"
 *   attachment: { name: string, url: string }
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const { collection, docId, field, attachment } = req.body as {
      collection: string, docId: string, field: string,
      attachment: { name: string; url: string }
    }
    if (!collection || !docId || !field || !attachment?.url) {
      return res.status(400).json({ error: 'missing fields' })
    }
    const ref = firestore.collection(collection).doc(docId)
    await ref.set({ [field]: attachment }, { merge: true })
    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e.message })
  }
}
