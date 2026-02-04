'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function PWARegister() {
  useEffect(() => {
    const isNativeParam =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('native') === '1'
    const isNative =
      Capacitor.isNativePlatform?.() ||
      (typeof window !== 'undefined' &&
        ((window as any)?.Capacitor?.isNativePlatform?.() ||
          (window as any)?.Capacitor?.getPlatform?.() === 'android' ||
          (window as any)?.Capacitor?.getPlatform?.() === 'ios' ||
          navigator.userAgent.includes('Capacitor')))
    if (isNative || isNativeParam) return
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
