// file: src/lib/firebaseAdmin.ts
import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import admin from 'firebase-admin'

function getAdminApp() {
  if (getApps().length > 0) return getApp()

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('❌ Falten variables FIREBASE_* a .env')
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: 'cal-blay-webapp.firebasestorage.app',
  })
}

const app = getAdminApp()
const firestoreAdmin = getFirestore(app)
const storageAdmin = admin.storage()
const messagingAdmin = admin.messaging()

export { app, firestoreAdmin, storageAdmin, messagingAdmin }
