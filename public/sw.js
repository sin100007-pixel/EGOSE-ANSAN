// EGOSE emergency network-only service worker
// version: 20260507-hard-reset-4
// 목적: 기존 cache-first PWA service worker가 카카오톡/삼성 브라우저에서 이미지/API를 가로채는 문제를 해제합니다.

const EGOSE_SW_VERSION = "20260507-hard-reset-4";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "EGOSE_CLEAR_CACHE") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
});

// fetch 이벤트에서 respondWith를 호출하지 않습니다.
// 모든 이미지, API, JS, CSS 요청은 브라우저 기본 네트워크 요청으로 그대로 통과합니다.
self.addEventListener("fetch", () => {
  return;
});
