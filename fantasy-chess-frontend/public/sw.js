const CACHE = 'flc-shell-v2'
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function offlineResponse() {
  return new Response('You are offline. Reconnect and reload Fantasy League Chess.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function fromCache(request) {
  const cached = (await caches.match(request)) || (await caches.match('/'))
  return cached || offlineResponse()
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode !== 'navigate') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => undefined)
        return response
      })
      .catch(() => fromCache(request)),
  )
})

self.addEventListener('push', (event) => {
  const payload = {
    title: 'Fantasy League Chess',
    body: 'Titled Tuesday starts tomorrow. Set your lineup before it locks.',
    url: '/dashboard',
  }
  try {
    if (event.data) Object.assign(payload, event.data.json())
  } catch {
    // Keep the default reminder if the payload is not JSON.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/dashboard' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
