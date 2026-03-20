const CACHE = "egose-v2";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", OFFLINE_URL]))
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    )
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((r) => r || caches.match(OFFLINE_URL))
    )
  );
});
