//filename:src\hooks\useFCMToken.ts
'use client'

import { useState } from 'react'
import { getToken } from 'firebase/messaging'
import { messaging } from '@/lib/firebaseClient'

export function useFCMToken() {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestToken = async (): Promise<string | null> => {
    try {
      if (!messaging) {
        setError('FCM no està disponible')
        return null
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      if (!vapidKey) {
        setError('Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY')
        return null
      }

      const newToken = await getToken(messaging, { vapidKey })
      console.log('[CalBlay] FCM token:', newToken)

      setToken(newToken)
      return newToken
    } catch (err: any) {
      console.error('[CalBlay] Error obtenint token FCM:', err)
      setError(err.message)
      return null
    }
  }

  return { token, error, requestToken }
}
