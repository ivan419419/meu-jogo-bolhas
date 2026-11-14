const CACHE_NAME = "bolhas-shell-v2";
const APP_SHELL_URL = new URL("./", self.registration.scope).href;
const PRECACHE_URLS = [
  APP_SHELL_URL,
  new URL("manifest.json", self.registration.scope).href,
  new URL("icon-192.png", self.registration.scope).href,
  new URL("icon-512.png", self.registration.scope).href,
];
const PRECACHE_PATHS = new Set(PRECACHE_URLS.map((url) => new URL(url).pathname));
const APP_SHELL_PATH = new URL(APP_SHELL_URL).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("bolhas-shell-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";
  const cachedAssetUrl = PRECACHE_URLS.find(
    (url) => new URL(url).pathname === requestUrl.pathname,
  );
  if (!isNavigation && !PRECACHE_PATHS.has(requestUrl.pathname)) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (
          cachedAssetUrl &&
          response.status === 200 &&
          response.type !== "opaque"
        ) {
          const cache = await caches.open(CACHE_NAME);
          const cacheKey = requestUrl.pathname === APP_SHELL_PATH ? APP_SHELL_URL : cachedAssetUrl;
          await cache.put(cacheKey, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigation) return (await caches.match(APP_SHELL_URL)) ?? Response.error();
        return Response.error();
      }
    })(),
  );
});
