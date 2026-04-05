const CACHE_NAME = "paperclip-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== "GET" || url.pathname.startsWith("/api")) {
    return;
  }

  // Network-first for everything — cache is only an offline fallback
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, clone);
        }
        return response;
      } catch {
        // Synthetic 503: only used when fetch() rejects (e.g. server down, connection reset).
        // On localhost, prefer disabling SW registration (see ui/src/main.tsx) to avoid false
        // "503" after brief Paperclip restarts.
        try {
          if (request.mode === "navigate") {
            const cached = await caches.match("/");
            return cached ?? new Response("Offline", { status: 503 });
          }
          const cached = await caches.match(request);
          return cached ?? new Response("Offline", { status: 503 });
        } catch {
          return new Response("Offline", { status: 503 });
        }
      }
    })()
  );
});
