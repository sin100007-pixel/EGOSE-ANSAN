
const CACHE = 'pwa-qr-v1';
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
    '/',
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Network-first for navigation requests (html)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(request);
        return cached || caches.match('/');
      }
    })());
    return;
  }
  // Cache-first for others
  event.respondWith(caches.match(request).then(c => c || fetch(request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(cache => cache.put(request, copy));
    return r;
  })));
});
