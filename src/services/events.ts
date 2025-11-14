// ✅ file: src/services/events.ts
import { firestoreAdmin } from '@/lib/firebaseAdmin'

export interface Event {
  id: string
  title: string
  date: string // ISO string
  location: string
  description?: string
}

const db = firestoreAdmin

export async function fetchEvents(): Promise<Event[]> {
  const snapshot = await db.collection('events').orderBy('date', 'asc').get()
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Event, 'id'>),
  }))
}

export async function fetchEventById(id: string): Promise<Event | null> {
  const doc = await db.collection('events').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...(doc.data() as Omit<Event, 'id'>) }
}
