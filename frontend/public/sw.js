const CACHE_NAME = "healthguardian-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache
        .addAll([
          "/",
          "/index.html",
          "/manifest.webmanifest",
          "/favicon-16.png",
          "/favicon-32.png",
          "/apple-touch-icon.png",
          "/pwa-192.png",
          "/pwa-512.png",
        ])
        .catch((err) => {
          console.warn("Pre-caching assets failed (expected in dev environment):", err);
        });
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Skip cross-origin or non-GET requests
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== "GET") {
    return;
  }

  // Skip API calls
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the response if it's a valid GET request
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) return response;
          // Fallback to index.html for SPA routes offline
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      }),
  );
});
