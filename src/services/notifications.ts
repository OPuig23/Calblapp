// src/services/notifications.ts
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'


type NewShiftNotif = {
  userId: string
  quadrantId: string
  payload: {
    weekStartISO: string
    weekLabel: string
    dept?: string
    countAssignments?: number
  }
}

export async function createNotificationsForQuadrant(notifs: NewShiftNotif[]) {
  const batch = db.batch()
  const now = new Date()

  for (const n of notifs) {
    const notifRef = db
      .collection('users')
      .doc(n.userId)
      .collection('notifications')
      .doc()

    batch.set(notifRef, {
      type: 'NEW_SHIFTS',
      quadrantId: n.quadrantId,
      createdAt: now,
      read: false,
      payload: n.payload || {},
    })

    const userRef = db.collection('users').doc(n.userId)
    batch.update(userRef, { notificationsUnread: FieldValue.increment(1) })
  }

  await batch.commit()
}

/** Marcar totes com llegides per usuari */
export async function markAllRead(userId: string) {
  const snap = await db.collection('users').doc(userId).collection('notifications')
    .where('read', '==', false).get()

  const batch = db.batch()
  snap.forEach(doc => batch.update(doc.ref, { read: true }))
  batch.update(db.collection('users').doc(userId), { notificationsUnread: 0 })
  await batch.commit()
}

/** Marcar totes les d’un quadrant com llegides (per si hi ha més d’una) */
export async function markQuadrantRead(userId: string, quadrantId: string) {
  const snap = await db.collection('users').doc(userId).collection('notifications')
    .where('quadrantId', '==', quadrantId).where('read', '==', false).get()

  if (snap.empty) return
  const batch = db.batch()
  let toDecrement = 0
  snap.forEach(doc => { batch.update(doc.ref, { read: true }); toDecrement++ })
  batch.update(db.collection('users').doc(userId), { notificationsUnread: FieldValue.increment(-toDecrement) })
  await batch.commit()
}

