'use client'

import { useEffect, useState } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setError('Aquest navegador no suporta notificacions push')
      return
    }
    setPermission(Notification.permission)
  }, [])

  const requestPermission = async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Notificacions no suportades')
      }
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        setError('Has de permetre les notificacions al navegador')
      }
      return result
    } catch (err) {
      setError('No s’ha pogut demanar permís')
      return 'denied'
    }
  }

  const subscribeUser = async (userId: string) => {
    try {
      if (typeof window === 'undefined') throw new Error('No window')
      if (!('serviceWorker' in navigator)) throw new Error('No SW disponible')

      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js')
      }
      if (!registration) throw new Error('No SW disponible')
      if (!registration.active) {
        registration = await navigator.serviceWorker.ready
      }
      if (!registration || !registration.pushManager) {
        throw new Error('Push no disponible en aquest dispositiu')
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      }

      const convertedKey = urlBase64ToUint8Array(vapidKey)
      const existingSub = await registration.pushManager.getSubscription()
      const sub =
        existingSub ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        }))

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub }),
      })

      if (!res.ok) {
        throw new Error('Error enviant subscripció')
      }
      return true
    } catch (err: any) {
      setError(err?.message || 'Error activant notificacions')
      return false
    }
  }

  return { permission, error, requestPermission, subscribeUser }
}

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
