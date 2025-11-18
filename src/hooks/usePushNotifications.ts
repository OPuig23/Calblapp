// filename: src/hooks/usePushNotifications.ts
'use client'

import { useState, useEffect } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  // 🔹 Inicialitzar permissos un cop ja hi ha window
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // 🔹 1) Demanar permís
  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Notificacions no suportades')
      }

      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (err) {
      setError('No s’ha pogut demanar permís')
      return 'denied'
    }
  }

  // 🔹 2) Subscriure usuari
  const subscribeUser = async (userId: string) => {
    try {
      if (typeof window === 'undefined') throw new Error('No window')
      if (!('serviceWorker' in navigator)) throw new Error('No SW disponible')

      const registration = await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')

      const convertedKey = urlBase64ToUint8Array(vapidKey)

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })

      setSubscription(sub)

      const res = await fetch('/api/push/subscribe', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub }),
      })

      if (!res.ok) throw new Error('Error enviant subscripció')
      return true
    } catch (err: any) {
      setError(String(err))
      return false
    }
  }

  return { permission, error, subscription, requestPermission, subscribeUser }
}

// 🔹 Helper
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
