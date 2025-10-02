// file: src/lib/quadrant.ts
import { firestore } from './firebaseAdmin'

export interface DraftRow {
  id: string
  personId: string
  name: string
  role?: string
  start: string
  end: string
  department: string
}

export async function fetchDraftRows(
  department: string,
  weekStart: string,
  weekEnd: string
): Promise<DraftRow[]> {
  const docId = `${department}:${weekStart}:${weekEnd}`
  const snap = await firestore.collection('quadrantDrafts').doc(docId).get()
  const data = snap.data()
  return Array.isArray(data?.draft) ? (data!.draft as DraftRow[]) : []
}

export async function saveDraftRows(
  department: string,
  weekStart: string,
  weekEnd: string,
  draft: DraftRow[]
): Promise<void> {
  const docId = `${department}:${weekStart}:${weekEnd}`
  await firestore
    .collection('quadrantDrafts')
    .doc(docId)
    .set({ department, weekStart, weekEnd, draft }, { merge: true })
}
