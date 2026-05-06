// 카카오톡 인앱브라우저 이미지/API 깨짐 방지를 위한 emergency no-op service worker
// 기존 egose-v2 캐시와 fetch 가로채기를 제거하기 위한 파일입니다.

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

// 중요:
// fetch 이벤트에서 event.respondWith를 절대 호출하지 않습니다.
// 그러면 이미지, API, JS, CSS 요청이 전부 브라우저 기본 네트워크로 그대로 갑니다.
self.addEventListener("fetch", () => {
  return;
});