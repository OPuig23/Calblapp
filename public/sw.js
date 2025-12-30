// public/sw.js
// Service Worker bàsic – Cal Blay

self.addEventListener('install', event => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

// (Opcional) placeholder per futures notificacions / cache
