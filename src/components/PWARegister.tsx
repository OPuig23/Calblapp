'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          console.log('[PWA] Service Worker registrat')
        })
        .catch(err => {
          console.error('[PWA] Error registrant SW', err)
        })
    }
  }, [])

  return null
}
