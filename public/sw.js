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
  // Use Cache-First for static assets, Network-First for others
  const url = new URL(event.request.url);
  
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  } else {
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
