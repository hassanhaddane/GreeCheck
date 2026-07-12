/* GreeCheck service worker — public shell/assets only. User data stays in IndexedDB. */
const VERSION = "gc-v4";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const MAX_RUNTIME_ENTRIES = 40;

const PRECACHE = [
  "/fr/offline",
  "/en/offline",
  "/ar/offline",
  "/fr/manifest.webmanifest",
  "/en/manifest.webmanifest",
  "/ar/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // Atomic install: a broken release must not replace the last working worker.
    caches.open(SHELL).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL && key !== RUNTIME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname);
}

function localeFromPath(pathname) {
  const locale = pathname.split("/")[1];
  return locale === "en" || locale === "ar" ? locale : "fr";
}

async function putBounded(cacheName, request, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        event.waitUntil(putBounded(RUNTIME, request, response.clone()));
        return response;
      } catch {
        const cached = await caches.match(request, { ignoreSearch: true });
        if (cached) return cached;
        const locale = localeFromPath(url.pathname);
        return (await caches.match(`/${locale}/offline`)) || (await caches.match("/fr/offline")) || Response.error();
      }
    })());
    return;
  }

  if (sameOrigin && isStaticAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(request).then((response) => {
        event.waitUntil(putBounded(SHELL, request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || network;
    })());
    return;
  }

  if (/openfoodfacts\.org$/.test(url.hostname)) {
    event.respondWith(fetch(request).then((response) => {
      event.waitUntil(putBounded(RUNTIME, request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});
