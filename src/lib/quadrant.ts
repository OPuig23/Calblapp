// File: src/lib/quadrant.ts
import { firestore } from './firebaseAdmin'

export async function fetchDraftRows(
  department: string,
  weekStart: string,
  weekEnd: string
): Promise<any[]> {
  const docId = `${department}:${weekStart}:${weekEnd}`
  const snap = await firestore.collection('quadrantDrafts').doc(docId).get()
  const data = snap.data()
  return Array.isArray(data?.draft) ? data!.draft : []
}

export async function saveDraftRows(
  department: string,
  weekStart: string,
  weekEnd: string,
  draft: any[]
): Promise<void> {
  const docId = `${department}:${weekStart}:${weekEnd}`
  await firestore
    .collection('quadrantDrafts')
    .doc(docId)
    .set({ department, weekStart, weekEnd, draft }, { merge: true })
}
