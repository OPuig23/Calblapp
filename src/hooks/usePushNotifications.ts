// filename: src/hooks/usePushNotifications.ts
'use client'

import { useState } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  // 🔹 1) Demanar permís
  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      console.log('[CalBlay] Permís notificacions:', result)
      return result
    } catch (err) {
      console.error('[CalBlay] Error demanant permís:', err)
      setError('No s’ha pogut demanar permís')
      return 'denied'
    }
  }

  // 🔹 2) Registrar subscripció WebPush + enviar-la al backend
  const subscribeUser = async (userId: string) => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Navigator no suporta Service Workers')
      }

      const registration = await navigator.serviceWorker.ready

      // Clau pública que generarem després (PAS 4)
      const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      }

      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      console.log('[CalBlay] Subscripció WebPush creada:', sub)
      setSubscription(sub)

      // 🔹 Enviar al backend perquè es guardi al Firestore
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub }),
      })

      if (!res.ok) throw new Error('Error enviant subscripció al servidor')

      console.log('[CalBlay] Subscripció guardada al servidor')
      return true
    } catch (err) {
      console.error('[CalBlay] Error subscrivint usuari:', err)
      setError(String(err))
      return false
    }
  }

  return {
    permission,
    error,
    subscription,
    requestPermission,
    subscribeUser,
  }
}

// Helper per convertir clau VAPID
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
