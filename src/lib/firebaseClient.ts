// src/lib/firebaseClient.ts
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, onMessage } from 'firebase/messaging'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Inicialitzar Firebase App
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// 🔥 AFEGIM FIRESTORE CLIENT
export const db = getFirestore(firebaseApp)

// Storage
export const storage = getStorage(firebaseApp)

// Messaging
export const messaging = (() => {
  if (typeof window === 'undefined') return null
  try {
    return getMessaging(firebaseApp)
  } catch (err) {
    return null
  }
})()

if (messaging) {
  onMessage(messaging, (payload) => {
    console.log('[CalBlay] Notificació rebuda en foreground:', payload)
  })
}
