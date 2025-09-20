// Basic service worker for offline caching
const CACHE_NAME = "sdb-cache-v1";
const SCOPE = self.registration?.scope || "./";
const CORE_ASSETS = [
  "index.html",
  "styles.css",
  "scripts.js",
  "utilities.js",
  "settings-handler.js",
  "ai-service-handler.js",
  "transcript-handler.js",
  "export-handler.js",
  "manifest.json",
  "assets/logo.png",
  "assets/logo_name.png",
  "assets/favicon.ico",
  "assets/screenshot-light.jpg",
  "assets/screenshot-dark.jpg",
].map((p) => new URL(p, SCOPE).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET and same-origin http(s) requests
  if (req.method !== "GET") return;
  try {
    const url = new URL(req.url);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const isSameOrigin = url.origin === self.location.origin;
    if (!isHttp || !isSameOrigin) return;
  } catch (_) {
    // If URL parsing fails, bail out
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Cache a copy of successful responses
          if (res && res.status === 200 && res.type === "basic") {
            const resClone = res.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(req, resClone))
              .catch(() => {
                // Ignore caching errors (e.g., unsupported schemes)
              });
          }
          return res;
        })
        .catch(() => cached);

      // Return cached first, then update cache in background
      return cached || fetchPromise;
    })
  );
});
