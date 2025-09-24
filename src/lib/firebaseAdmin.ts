// src/lib/firebaseAdmin.ts
import { getApps, getApp, initializeApp, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

function getAdminApp(): App {
  if (getApps().length) {
    console.log('[firebaseAdmin] 🔄 Reutilitzant app Firebase Admin existent')
    return getApp()
  }

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey      = process.env.FIREBASE_PRIVATE_KEY
  const privateKey  = (rawKey || '').replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('❌ Falten variables FIREBASE_* a .env')
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  })

  console.log('[firebaseAdmin] ✅ Firebase Admin inicialitzat amb projecte:', projectId)
  return app
}

const app: App = getAdminApp()
const db: Firestore = getFirestore(app)

// 👇 Tornem a exportar "firestore" per compatibilitat amb els mòduls antics
export const firestore = db  

export { app, db }
