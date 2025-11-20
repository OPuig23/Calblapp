// ✅ file: src/lib/firebaseAdmin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let app

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY
  const privateKey = rawKey?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('❌ Falten variables FIREBASE_* a .env')
  }

  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: 'cal-blay-webapp.firebasestorage.app',
  })

  console.log('[firebaseAdmin] ✅ Inicialitzat Firebase Admin')
} else {
  app = getApps()[0]
}

export const firestoreAdmin = getFirestore(app)
export const storageAdmin = getStorage(app)
