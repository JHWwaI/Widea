/* Widea Service Worker — 비활성화 (개발 중 캐시 문제 방지)
 * 기존 캐시 모두 제거하고 자기 자신을 unregister.
 * 추후 안정화 시 복구. */

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 모든 캐시 제거
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      // 본인 unregister
      await self.registration.unregister();
      // 모든 클라이언트 강제 새로고침
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        try { c.navigate(c.url); } catch { /* ignore */ }
      }
    })(),
  );
});

// fetch 가로채지 않음 → 모든 요청은 네트워크에서 직접
