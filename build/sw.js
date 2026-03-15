const CACHE_NAME = "smile-artist-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-512.png",
];

// Smile Artist – Service worker for caching and push notifications
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Use Network-First for critical entry points to avoid serving outdated index.html
  // with missing or broken hash links to JS/CSS chunks.
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/manifest.json") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Use Cache-First for other static assets defined in ASSETS
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  } else {
    // Default Network-First for everything else
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Smile Artist", {
      body: data.body || "You have a new notification",
      icon: "/icon-512.png",
      badge: "/icon-512.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow("/");
    })
  );
});
