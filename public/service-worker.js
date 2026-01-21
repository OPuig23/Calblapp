// ✅ Service Worker Cal Blay – Notificacions Push bàsics

// Instal·lació del SW
self.addEventListener('install', (event) => {
  console.log('Cal Blay SW installed')
  // Ens assegurem que el SW esdevingui actiu el més aviat possible
  self.skipWaiting()
})

// Activació del SW
self.addEventListener('activate', (event) => {
  console.log('Cal Blay SW activated')
  // Reclamem el control de totes les pestanyes obertes de la PWA
  event.waitUntil(self.clients.claim())
})

// 📲 Rebre una notificació push
self.addEventListener('push', (event) => {
  console.log('[CalBlay SW] Push rebut:', event)

  let data = {}

  if (event.data) {
    try {
      // Intentem llegir el payload com a JSON
      data = event.data.json()
    } catch (err) {
      // Si no és JSON, fem servir el text
      data = { title: event.data.text() }
    }
  }

  const title = data.title || 'Cal Blay'
  const options = {
    body: data.body || 'Tens una nova notificació',
    icon: data.icon || '/icons/icon-192.png',   // ajustarem si cal
    badge: data.badge || '/icons/icon-192.png',   // ajustarem si cal
    data: {
      // URL on volem portar l’usuari quan fa clic
      url: data.url || '/',
      ...data,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 🖱️ Quan l’usuari fa clic a la notificació
self.addEventListener('notificationclick', (event) => {
  console.log('[CalBlay SW] Notification click')
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ja hi ha una pestanya oberta amb la nostra app, la fem focus
      for (const client of clientList) {
        if ('focus' in client) {
          // Pots afinar aquesta condició si vols matx exacte de URL
          return client.focus()
        }
      }
      // Si no hi ha cap finestra oberta, en creem una de nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
