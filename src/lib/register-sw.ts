// src/lib/register-sw.ts
export function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) {
    console.warn('[CalBlay] Aquest navegador no suporta Service Workers')
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[CalBlay] Service Worker registrat correctament:', reg)
      })
      .catch((err) => {
        console.error('[CalBlay] Error registrant el SW:', err)
      })
  })
}
