const CACHE_NAME = "switch-auction-shell-v1";
const APP_URL = new URL("./buyers-auction.html", self.location.href).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.add(new Request(APP_URL, {cache:"reload"})); } catch (_) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls, login actions, or live auction data.
  if (url.searchParams.has("api") || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && url.pathname.endsWith("/buyers-auction.html")) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(APP_URL, fresh.clone());
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(APP_URL);
        if (cached) return cached;
        return new Response("برای استفاده از پنل مزایده، اتصال اینترنت را برقرار کنید.", {
          status: 503, headers: {"Content-Type":"text/plain; charset=utf-8"}
        });
      }
    })());
  }
});
