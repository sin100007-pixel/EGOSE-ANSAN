const CACHE_NAME = "egose-v4";
const OFFLINE_URL = "/offline";

const STATIC_ASSETS = [OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => undefined))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldSkipFetch(request) {
  if (request.method !== "GET") return true;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/_next/")) return true;

  const destination = request.destination;

  if (
    destination === "image" ||
    destination === "style" ||
    destination === "script" ||
    destination === "font" ||
    destination === "video" ||
    destination === "audio" ||
    destination === "manifest"
  ) {
    return true;
  }

  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (shouldSkipFetch(request)) return;

  const isNavigation =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html");

  if (!isNavigation) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedOffline = await cache.match(OFFLINE_URL);
      return cachedOffline || Response.error();
    })
  );
});