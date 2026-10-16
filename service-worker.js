const CACHE_NAME = "switch-app-shell-v2";
const APP_URLS = [
  new URL("./buyers-auction.html", self.location.href).href,
  new URL("./expert.html", self.location.href).href
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_URLS.map(async url => {
      try { await cache.add(new Request(url, {cache:"reload"})); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("switch-auction-shell-") || name.startsWith("switch-app-shell-") || name.startsWith("switch-expert-shell-")).filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never cache API calls, authentication actions, live data, or external libraries.
  if (url.searchParams.has("api") || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    const appUrl = APP_URLS.find(item => new URL(item).pathname === url.pathname);
    if (!appUrl) return;
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(appUrl, fresh.clone());
        }
        return fresh;
      } catch (_) {
        const cached = await caches.match(appUrl);
        if (cached) return cached;
        return new Response("برای استفاده از پنل، اتصال اینترنت را برقرار کنید.", {status:503,headers:{"Content-Type":"text/plain; charset=utf-8"}});
      }
    })());
  }
});
