/* GreeCheck service worker — public shell/assets only. User data stays in IndexedDB. */
const revision = new URL(self.location.href).searchParams.get("build") ?? "";
const VERSION = "gc-v6" + (/^[a-z0-9]{7,40}$/.test(revision) ? "-" + revision : "");
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const RUNTIME = `${VERSION}-runtime`;
const MAX_RUNTIME_ENTRIES = 40;
const isGreeCache = (name) => /^gc-v\d+(?:-[a-z0-9]+)?-(?:shell|static|runtime)$/.test(name);

const PAGES = ["fr", "en", "ar"].flatMap((locale) => ["/offline", "/scan", "/products", "/products/favorites", "/list"]
  .map((route) => `/${locale}${route}`));
const PRECACHE = [
  ...PAGES,
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
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(PRECACHE);
      const assets = new Set();
      await Promise.all(PAGES.map(async (path) => {
        const page = await cache.match(path);
        for (const [, asset] of (await page.text()).matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
          assets.add(asset);
        }
      }));
      await cache.addAll([...assets]);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => isGreeCache(key) && key !== SHELL && key !== STATIC && key !== RUNTIME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "RECOVER_CACHES") {
    event.waitUntil(Promise.all([caches.delete(STATIC), caches.delete(RUNTIME)])
      .then(() => event.source?.postMessage("CACHES_CLEARED")));
  }
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

  if (sameOrigin && request.mode === "navigate" && !url.pathname.startsWith("/api/")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (!url.search) event.waitUntil(putBounded(RUNTIME, request, response.clone()));
        return response;
      } catch {
        const cached = (!url.search && await caches.match(request, { cacheName: RUNTIME }))
          || (await caches.match(url.pathname, { cacheName: SHELL }));
        if (cached) return cached;
        const locale = localeFromPath(url.pathname);
        return (await caches.match(`/${locale}/offline`)) || (await caches.match("/fr/offline")) || Response.error();
      }
    })());
    return;
  }

  if (sameOrigin && isStaticAsset(url)) {
    event.respondWith((async () => {
      const pinned = await (await caches.open(SHELL)).match(request);
      if (pinned) return pinned;
      const cached = await caches.match(request, { cacheName: STATIC });
      const network = fetch(request).then((response) => {
        event.waitUntil(putBounded(STATIC, request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || network;
    })());
    return;
  }

  if (request.destination === "image" && ["images.openfoodfacts.org", "world.openfoodfacts.org", "static.openfoodfacts.org"].includes(url.hostname)) {
    event.respondWith(fetch(request).then((response) => {
      event.waitUntil(putBounded(RUNTIME, request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});
